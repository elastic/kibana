/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from 'src/core/public';
import type { History } from 'history';
import type { SerializableState } from 'src/plugins/kibana_utils/common';
import { migrateToLatest } from 'src/plugins/kibana_utils/common';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import type { UrlService } from '../../../common/url_service';
import { render } from './render';

export interface RedirectOptions {
  /** Locator ID. */
  id: string;

  /** Kibana version when locator params where generated. */
  version: string;

  /** Locator params. */
  params: unknown & SerializableState;
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
        this.onMount(params.history);
        return () => {
          unmount();
        };
      },
    });
  }

  protected onMount(history: History) {
    const options = this.parseSearchParams(history);
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

    const { state: migratedParams } = migrateToLatest(locator.migrations, {
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

  protected parseSearchParams(history: History): RedirectOptions {
    const search = new URLSearchParams(history.location.search);
    const id = search.get('l');
    const version = search.get('v');
    const paramsJson = search.get('p');

    if (!id) {
      const message = i18n.translate(
        'share.urlService.redirect.RedirectManager.missingParamLocator',
        {
          defaultMessage:
            'Locator ID not specified. Specify "l" search parameter in the URL, which should be an existing locator ID.',
          description:
            'Error displayed to user in redirect endpoint when redirection cannot be performed successfully, because of missing locator ID.',
        }
      );
      const error = new Error(message);
      this.error$.next(error);
      throw error;
    }

    if (!version) {
      const message = i18n.translate(
        'share.urlService.redirect.RedirectManager.missingParamVersion',
        {
          defaultMessage:
            'Locator params version not specified. Specify "v" search parameter in the URL, which should be the release version of Kibana when locator params were generated.',
          description:
            'Error displayed to user in redirect endpoint when redirection cannot be performed successfully, because of missing version parameter.',
        }
      );
      const error = new Error(message);
      this.error$.next(error);
      throw error;
    }

    if (!paramsJson) {
      const message = i18n.translate(
        'share.urlService.redirect.RedirectManager.missingParamParams',
        {
          defaultMessage:
            'Locator params not specified. Specify "p" search parameter in the URL, which should be JSON serialized object of locator params.',
          description:
            'Error displayed to user in redirect endpoint when redirection cannot be performed successfully, because of missing params parameter.',
        }
      );
      const error = new Error(message);
      this.error$.next(error);
      throw error;
    }

    let params: unknown & SerializableState;
    try {
      params = JSON.parse(paramsJson);
    } catch {
      const message = i18n.translate(
        'share.urlService.redirect.RedirectManager.invalidParamParams',
        {
          defaultMessage:
            'Could not parse locator params. Locator params must be serialized as JSON and set at "p" URL search parameter.',
          description:
            'Error displayed to user in redirect endpoint when redirection cannot be performed successfully, because locator parameters could not be parsed as JSON.',
        }
      );
      const error = new Error(message);
      this.error$.next(error);
      throw error;
    }

    return {
      id,
      version,
      params,
    };
  }
}
