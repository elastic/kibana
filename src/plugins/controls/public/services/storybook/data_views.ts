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
import { ControlsDataViewsService } from '../data_views';

export type DataViewsServiceFactory = PluginServiceFactory<ControlsDataViewsService>;

let currentDataView: DataView;
export const injectStorybookDataView = (dataView: DataView) => (currentDataView = dataView);

export const dataViewsServiceFactory: DataViewsServiceFactory = () => ({
  get: (() =>
    new Promise((r) =>
      setTimeout(() => r(currentDataView), 100)
    ) as unknown) as DataViewsPublicPluginStart['get'],
  getIdsWithTitle: (() =>
    new Promise((r) =>
      setTimeout(() => r([{ id: currentDataView.id, title: currentDataView.title }]), 100)
    ) as unknown) as DataViewsPublicPluginStart['getIdsWithTitle'],
  getDefaultId: () => Promise.resolve(currentDataView?.id ?? null),
});
