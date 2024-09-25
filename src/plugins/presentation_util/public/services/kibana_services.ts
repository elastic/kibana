/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

import { PresentationUtilPluginStartDeps } from '../types';

export let coreServices: CoreStart;
export let contentManagementService: ContentManagementPublicStart;
export let dataViewsService: DataViewsPublicPluginStart;
export let uiActionsService: UiActionsPublicStart;

const servicesReady$ = new BehaviorSubject(false);

export const setKibanaServices = (kibanaCore: CoreStart, deps: PresentationUtilPluginStartDeps) => {
  coreServices = kibanaCore;
  contentManagementService = deps.contentManagement;
  dataViewsService = deps.dataViews;
  uiActionsService = deps.uiActions;

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
