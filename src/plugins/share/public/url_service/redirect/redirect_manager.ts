/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { migrateToLatest } from '../../../../kibana_utils/common';
import type { UrlService } from '../../../common/url_service';
import { parseSearchParams, RedirectOptions } from '../../../common/url_service/locators/redirect';

export interface RedirectManagerDependencies {
  url: UrlService;
}

export class RedirectManager {
  public readonly error$ = new BehaviorSubject<null | Error>(null);

  constructor(public readonly deps: RedirectManagerDependencies) {}

  public registerRedirectApp(core: CoreSetup) {
    core.application.register({
      id: 'r',
      title: 'Redirect endpoint',
      chromeless: true,
      mount: async (params) => {
        const { render } = await import('./render');
        const unmount = render(params.element, { manager: this, theme: core.theme });
        this.onMount(params.history.location.search);
        return () => {
          unmount();
        };
      },
    });
  }

  public onMount(urlLocationSearch: string) {
    const options = this.parseSearchParams(urlLocationSearch);
    this.navigate(options);
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
