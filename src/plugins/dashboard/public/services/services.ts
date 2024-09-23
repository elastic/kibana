/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { CoreStart } from '@kbn/core/public';

import { DashboardStartDependencies } from '../plugin';
import { setDashboardServices } from './dashboard_services';
import { setKibanaServices } from './kibana_services';

const servicesReady$ = new BehaviorSubject(false);

export const setServices = (kibanaCore: CoreStart, deps: DashboardStartDependencies) => {
  setKibanaServices(kibanaCore, deps);
  setDashboardServices(kibanaCore, deps);
  servicesReady$.next(true);
};

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
