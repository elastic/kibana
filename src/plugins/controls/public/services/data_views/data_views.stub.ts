/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { mockOptionsListDataView } from '../../../common/mocks';

import { ControlsDataViewsService } from './types';

type DataViewsServiceFactory = PluginServiceFactory<ControlsDataViewsService>;

export const dataViewsServiceFactory: DataViewsServiceFactory = () => {
  const { getIdsWithTitle, getDefaultId } = dataViewPluginMocks.createStartContract();

  return {
    get: jest.fn().mockReturnValue(Promise.resolve(new DataView(mockOptionsListDataView))),
    getDefaultId,
    getIdsWithTitle,
  };
};
