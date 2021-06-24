/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from 'src/core/public';
import type { History } from 'history';
import { i18n } from '@kbn/i18n';
import type { SerializableState } from 'src/plugins/kibana_utils/common';
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

    // TODO: perform migration first
    locator
      .navigate(options.params)
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
    const params = search.get('p');

    if (!id) {
      const message = i18n.translate(
        'share.urlService.redirect.RedirectManager.invalidParamLocator',
        {
          defaultMessage:
            'Locator ID not specified. Specify "l" search parameter in the URL, which should be an existing locator ID.',
          description:
            'Error displayed to user in redirect endpoint when redirection cannot be performed successfully, because of invalid or missing locator ID.',
        }
      );
      const error = new Error(message);
      this.error$.next(error);
      throw error;
    }

    if (!version) {
      // TODO: show this error in UI.
      throw new Error('Invalid locator version (specify "v" param).');
    }

    if (!params) {
      // TODO: show this error in UI.
      throw new Error('Invalid locator params (specify "p" param).');
    }

    return {
      id,
      version,
      params: JSON.parse(params),
    };
  }
}
