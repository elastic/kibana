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
import type { SerializableRecord } from '@kbn/utility-types';
import { migrateToLatest } from '../../../../kibana_utils/common';
import type { UrlService } from '../../../common/url_service';
import { render } from './render';
import { parseSearchParams } from './util/parse_search_params';

export interface RedirectOptions {
  /** Locator ID. */
  id: string;

  /** Kibana version when locator params where generated. */
  version: string;

  /** Locator params. */
  params: unknown & SerializableRecord;
}

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
      mount: (params) => {
        const unmount = render(params.element, { manager: this });
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

    const migratedParams = migrateToLatest(locator.migrations, {
      state: options.params,
      version: options.version,
    });

    locator
      .navigate(migratedParams)
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
