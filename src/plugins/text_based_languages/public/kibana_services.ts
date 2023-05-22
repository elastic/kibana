/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { CoreStart } from '@kbn/core/public';

export let core: CoreStart;

const servicesReady$ = new BehaviorSubject<{ core: CoreStart; darkMode: boolean } | undefined>(
  undefined
);
export const untilPluginStartServicesReady = () => {
  if (servicesReady$.value) return Promise.resolve(servicesReady$.value);
  return new Promise<{ core: CoreStart; darkMode: boolean }>((resolve) => {
    const subscription = servicesReady$.subscribe((deps) => {
      if (deps) {
        subscription.unsubscribe();
        resolve(deps);
      }
    });
  });
};

export const setKibanaServices = (kibanaCore: CoreStart) => {
  core = kibanaCore;
  core.theme.theme$.subscribe(({ darkMode }) => {
    servicesReady$.next({ core, darkMode });
  });
};
