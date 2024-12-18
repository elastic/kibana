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

import { EmbeddableStart, EmbeddableStartDependencies } from '.';

export let core: CoreStart;
export let embeddableStart: EmbeddableStart;
export let uiActions: EmbeddableStartDependencies['uiActions'];
export let inspector: EmbeddableStartDependencies['inspector'];
export let usageCollection: EmbeddableStartDependencies['usageCollection'];
export let savedObjectsManagement: EmbeddableStartDependencies['savedObjectsManagement'];
export let savedObjectsTaggingOss: EmbeddableStartDependencies['savedObjectsTaggingOss'];
export let contentManagement: EmbeddableStartDependencies['contentManagement'];

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
  selfStart: EmbeddableStart,
  deps: EmbeddableStartDependencies
) => {
  core = kibanaCore;
  uiActions = deps.uiActions;
  inspector = deps.inspector;
  embeddableStart = selfStart;
  usageCollection = deps.usageCollection;
  savedObjectsManagement = deps.savedObjectsManagement;
  savedObjectsTaggingOss = deps.savedObjectsTaggingOss;
  contentManagement = deps.contentManagement;

  servicesReady$.next(true);
};
