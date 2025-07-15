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
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { ControlsPluginStartDeps } from '../types';

export let coreServices: CoreStart;
export let dataService: DataPublicPluginStart;
export let dataViewsService: DataViewsPublicPluginStart;
export let uiActionsService: UiActionsStart;
export let expressionsService: ExpressionsStart;
export let storageService: Storage;

export let fieldsMetadataService: FieldsMetadataPublicStart | undefined;
export let usageCollectionService: UsageCollectionStart | undefined;

const servicesReady$ = new BehaviorSubject(false);

export const setKibanaServices = (kibanaCore: CoreStart, deps: ControlsPluginStartDeps) => {
  coreServices = kibanaCore;
  dataService = deps.data;
  dataViewsService = deps.dataViews;
  uiActionsService = deps.uiActions;
  expressionsService = deps.expressions;
  storageService = deps.storage;
  fieldsMetadataService = deps.fieldsMetadata;
  usageCollectionService = deps.usageCollection;

  servicesReady$.next(true);
};

export const untilPluginStartServicesReady = () => {
  if (servicesReady$.value) return Promise.resolve(servicesReady$.value);
  return new Promise<void>((resolve) => {
    const subscription = servicesReady$.subscribe((isInitialized) => {
      if (isInitialized) {
        subscription.unsubscribe();
        resolve();
      }
    });
  });
};
