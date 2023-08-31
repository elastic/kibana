/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { ControlsDataViewsService } from './types';

export type DataViewsServiceFactory = PluginServiceFactory<ControlsDataViewsService>;

let currentDataView: DataView | undefined;
export const injectStorybookDataView = (dataView?: DataView) => (currentDataView = dataView);

export const dataViewsServiceFactory: DataViewsServiceFactory = () => ({
  get: ((dataViewId) =>
    new Promise((resolve, reject) =>
      setTimeout(() => {
        if (!currentDataView) {
          reject(
            new Error(
              'mock DataViews service currentDataView is undefined, call injectStorybookDataView to set'
            )
          );
        } else if (currentDataView.id === dataViewId) {
          resolve(currentDataView);
        } else {
          reject(
            new Error(
              `mock DataViews service currentDataView.id: ${currentDataView.id} does not match requested dataViewId: ${dataViewId}`
            )
          );
        }
      }, 100)
    ) as unknown) as DataViewsPublicPluginStart['get'],
  getIdsWithTitle: (() =>
    new Promise((resolve) =>
      setTimeout(() => {
        const idsWithTitle: Array<{ id: string | undefined; title: string }> = [];
        if (currentDataView) {
          idsWithTitle.push({ id: currentDataView.id, title: currentDataView.title });
        }
        resolve(idsWithTitle);
      }, 100)
    ) as unknown) as DataViewsPublicPluginStart['getIdsWithTitle'],
  getDefaultId: () => Promise.resolve(currentDataView?.id ?? null),
});
