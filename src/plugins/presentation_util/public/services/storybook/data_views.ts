/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '../create';
import { PresentationDataViewsService } from '../data_views';
import { storybookFlightsDataView } from './fixtures/flights';
import { DataViewsPublicPluginStart } from '../../../../data_views/public';

export type DataViewsServiceFactory = PluginServiceFactory<PresentationDataViewsService>;
export const dataViewsServiceFactory: DataViewsServiceFactory = () => ({
  get: (() =>
    new Promise((r) =>
      setTimeout(() => r(storybookFlightsDataView), 100)
    ) as unknown) as DataViewsPublicPluginStart['get'],
  getIdsWithTitle: (() =>
    new Promise((r) =>
      setTimeout(
        () => r([{ id: storybookFlightsDataView.id, title: storybookFlightsDataView.title }]),
        100
      )
    ) as unknown) as DataViewsPublicPluginStart['getIdsWithTitle'],
});
