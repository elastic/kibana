/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { ControlsPluginStartDeps } from '../../types';
import { ControlsDataViewsService } from './types';

export type DataViewsServiceFactory = KibanaPluginServiceFactory<
  ControlsDataViewsService,
  ControlsPluginStartDeps
>;

export const dataViewsServiceFactory: DataViewsServiceFactory = ({ startPlugins }) => {
  const {
    dataViews: { get, getIdsWithTitle, getDefaultId },
  } = startPlugins;

  return {
    get,
    getDefaultId,
    getIdsWithTitle,
  };
};
