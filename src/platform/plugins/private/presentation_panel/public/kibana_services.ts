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
import { PresentationPanelStartDependencies } from './plugin';

export let core: CoreStart;
export let uiActions: PresentationPanelStartDependencies['uiActions'];
export let inspector: PresentationPanelStartDependencies['inspector'];
export let usageCollection: PresentationPanelStartDependencies['usageCollection'];
export let savedObjectsManagement: PresentationPanelStartDependencies['savedObjectsManagement'];
export let savedObjectsTaggingOss: PresentationPanelStartDependencies['savedObjectsTaggingOss'];
export let contentManagement: PresentationPanelStartDependencies['contentManagement'];

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
  deps: PresentationPanelStartDependencies
) => {
  core = kibanaCore;
  uiActions = deps.uiActions;
  inspector = deps.inspector;
  usageCollection = deps.usageCollection;
  contentManagement = deps.contentManagement;
  savedObjectsManagement = deps.savedObjectsManagement;
  savedObjectsTaggingOss = deps.savedObjectsTaggingOss;

  servicesReady$.next(true);
};
