/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { CoreStart } from '@kbn/core/public';

import { ControlsExampleStartDeps } from '../../plugin';

export let coreServices: CoreStart;
export let dataService: ControlsExampleStartDeps['data'];
export let navigationService: ControlsExampleStartDeps['navigation'];
export let uiActions: ControlsExampleStartDeps['uiActions'];

const servicesReady$ = new BehaviorSubject(false);

export const untilPluginStartServicesReady = () => {
  if (servicesReady$.value) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const subscription = servicesReady$.subscribe((isInitialized) => {
      if (isInitialized) {
        subscription.unsubscribe();
        resolve();
      }
    });
  });
};

export const setKibanaServices = (kibanaCore: CoreStart, deps: ControlsExampleStartDeps) => {
  coreServices = kibanaCore;
  dataService = deps.data;
  uiActions = deps.uiActions;
  navigationService = deps.navigation;
  servicesReady$.next(true);
};
