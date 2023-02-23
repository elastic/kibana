/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';

import {
  RedirectAppLinksServices,
  RedirectAppLinksKibanaDependencies,
} from '@kbn/shared-ux-link-redirect-app-types';

type Params = Pick<RedirectAppLinksServices, 'navigateToUrl'>;

const defaultParams: Params = {
  navigateToUrl: (url: string) => {
    return new Promise<void>(() => {});
  },
};

/**
 * Returns the Jest-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getRedirectAppLinksServicesMock = (
  params?: Partial<Params>
): RedirectAppLinksServices => {
  const navigateToUrl =
    params && params.navigateToUrl !== undefined
      ? params.navigateToUrl
      : defaultParams.navigateToUrl;

  const services: RedirectAppLinksServices = {
    navigateToUrl,
    currentAppId: 'currentAppId',
  };

  return services;
};

export const getRedirectAppLinksKibanaDependenciesMock = (
  params?: Partial<Params>
): RedirectAppLinksKibanaDependencies => {
  const navigateToUrl =
    params && params.navigateToUrl !== undefined
      ? params.navigateToUrl
      : defaultParams.navigateToUrl;

  return {
    coreStart: {
      application: {
        currentAppId$: new Observable<string>((subscriber) => {
          subscriber.next('currentAppId');
        }),
        navigateToUrl,
      },
    },
  };
};
