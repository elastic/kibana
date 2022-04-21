/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import type { Location } from 'history';
import { migrateToLatest } from '@kbn/kibana-utils-plugin/common';
import type { UrlService } from '../../../common/url_service';
import { parseSearchParams, RedirectOptions } from '../../../common/url_service/locators/redirect';
import {
  LEGACY_SHORT_URL_LOCATOR_ID,
  LegacyShortUrlLocatorParams,
} from '../../../common/url_service/locators/legacy_short_url_locator';

export interface RedirectManagerDependencies {
  url: UrlService;
}

export class RedirectManager {
  public readonly error$ = new BehaviorSubject<null | Error>(null);

  constructor(public readonly deps: RedirectManagerDependencies) {}

  public registerLocatorRedirectApp(core: CoreSetup) {
    core.application.register({
      id: 'r',
      title: 'Redirect endpoint',
      chromeless: true,
      mount: async (params) => {
        const { render } = await import('./render');
        const unmount = render(params.element, { manager: this, theme: core.theme });
        this.onMount(params.history.location);
        return () => {
          unmount();
        };
      },
    });
  }

  public registerLegacyShortUrlRedirectApp(core: CoreSetup) {
    core.application.register({
      id: 'short_url_redirect',
      appRoute: '/goto',
      title: 'Short URL Redirect',
      chromeless: true,
      mount: async () => {
        const urlId = location.pathname.match(new RegExp(`/goto/(.*)$`))?.[1];
        if (!urlId) throw new Error('Url id not present in path');
        const urlService = this.deps.url;
        const shortUrls = urlService.shortUrls.get(null);
        const shortUrl = await shortUrls.get(urlId);
        const locatorId = shortUrl.data.locator.id;
        const locator = urlService.locators.get(locatorId);
        if (!locator) throw new Error(`Locator [id = ${locatorId}] not found.`);
        const locatorState = shortUrl.data.locator.state;
        if (shortUrl.data.locator.id !== LEGACY_SHORT_URL_LOCATOR_ID) {
          await locator.navigate(locatorState, { replace: true });
          return () => {};
        }
        let redirectUrl = (locatorState as LegacyShortUrlLocatorParams).url;
        const storeInSessionStorage = core.uiSettings.get('state:storeInSessionStorage');
        if (storeInSessionStorage) {
          const { hashUrl } = await import('@kbn/kibana-utils-plugin/public');
          redirectUrl = hashUrl(redirectUrl);
        }
        const url = core.http.basePath.prepend(redirectUrl);
        location.href = url;
        return () => {};
      },
    });
  }

  public onMount(location: Location) {
    const pathname = location.pathname;
    const isShortUrlRedirectBySlug = pathname.startsWith('/s/');
    if (isShortUrlRedirectBySlug) {
      this.navigateToShortUrlBySlug(pathname.substring('/s/'.length));
      return;
    }
    const urlLocationSearch = location.search;
    const options = this.parseSearchParams(urlLocationSearch);
    this.navigate(options);
  }

  private navigateToShortUrlBySlug(slug: string) {
    (async () => {
      const urlService = this.deps.url;
      const shortUrls = urlService.shortUrls.get(null);
      const shortUrl = await shortUrls.resolve(slug);
      const locatorId = shortUrl.data.locator.id;
      const locator = urlService.locators.get(locatorId);
      if (!locator) throw new Error(`Locator "${locatorId}" not found.`);
      const locatorState = shortUrl.data.locator.state;
      await locator.navigate(locatorState, { replace: true });
    })().catch((error) => {
      this.error$.next(error);
      // eslint-disable-next-line no-console
      console.error(error);
    });
  }

  public navigate(options: RedirectOptions) {
    const locator = this.deps.url.locators.get(options.id);

    if (!locator) {
      const message = i18n.translate('share.urlService.redirect.RedirectManager.locatorNotFound', {
        defaultMessage: 'Locator [ID = {id}] does not exist.',
        values: {
          id: options.id,
        },
        description:
          'Error displayed to user in redirect endpoint when redirection cannot be performed successfully, because locator does not exist.',
      });
      const error = new Error(message);
      this.error$.next(error);
      throw error;
    }

    const locatorMigrations =
      typeof locator.migrations === 'function' ? locator.migrations() : locator.migrations;
    const migratedParams = migrateToLatest(locatorMigrations, {
      state: options.params,
      version: options.version,
    });

    locator
      .navigate(migratedParams, {
        replace: true, // We do not want the redirect app URL to appear in browser navigation history
      })
      .then()
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.log('Redirect endpoint failed to execute locator redirect.');
        // eslint-disable-next-line no-console
        console.error(error);
      });
  }

  protected parseSearchParams(urlLocationSearch: string): RedirectOptions {
    try {
      return parseSearchParams(urlLocationSearch);
    } catch (error) {
      this.error$.next(error);
      throw error;
    }
  }
}
