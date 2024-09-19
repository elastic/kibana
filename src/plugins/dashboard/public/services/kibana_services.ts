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
import { EmbeddableStart } from '@kbn/embeddable-plugin/public/plugin';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public/plugin';
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';

import { DashboardStartDependencies } from '../plugin';

export let coreServices: CoreStart;
export let dataService: DataPublicPluginStart;
export let embeddableService: EmbeddableStart;
export let fieldFormatService: FieldFormatsStart;
export let presentationUtilService: PresentationUtilPluginStart;
// export let dataViewsService: DataViewsPublicPluginStart;

const servicesReady$ = new BehaviorSubject(false);

export const setKibanaServices = (kibanaCore: CoreStart, deps: DashboardStartDependencies) => {
  coreServices = kibanaCore;
  dataService = deps.data;
  embeddableService = deps.embeddable;
  fieldFormatService = deps.fieldFormats;
  presentationUtilService = deps.presentationUtil;
  // dataViewsService = deps.dataViews;

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
