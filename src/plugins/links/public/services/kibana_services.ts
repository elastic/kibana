/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { CoreStart } from '@kbn/core/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';

import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { NavigationEmbeddableStartDependencies } from '../plugin';

export let coreServices: CoreStart;
export let dashboardServices: DashboardStart;
export let embeddableService: EmbeddableStart;
export let contentManagement: ContentManagementPublicStart;

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

export const setKibanaServices = (
  kibanaCore: CoreStart,
  deps: NavigationEmbeddableStartDependencies
) => {
  coreServices = kibanaCore;
  dashboardServices = deps.dashboard;
  embeddableService = deps.embeddable;
  contentManagement = deps.contentManagement;

  servicesReady$.next(true);
};
