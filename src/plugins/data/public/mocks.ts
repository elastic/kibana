/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDatatableUtilitiesMock } from '../common/mocks';
import { DataPlugin } from '.';
import { searchServiceMock } from './search/mocks';
import { queryServiceMock } from './query/mocks';
import { createNowProviderMock } from './now_provider/mocks';
import { dataViewPluginMocks } from './data_views/mocks';

export type Setup = jest.Mocked<ReturnType<DataPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<DataPlugin['start']>>;

const createSetupContract = (): Setup => {
  const querySetupMock = queryServiceMock.createSetupContract();
  return {
    search: searchServiceMock.createSetupContract(),
    query: querySetupMock,
  };
};

const createStartContract = (): Start => {
  const queryStartMock = queryServiceMock.createStartContract();
  const dataViews = dataViewPluginMocks.createStartContract();

  return {
    actions: {
      createFiltersFromValueClickAction: jest.fn().mockResolvedValue(['yes']),
      createFiltersFromRangeSelectAction: jest.fn(),
      createFiltersFromMultiValueClickAction: jest.fn(),
    },
    datatableUtilities: createDatatableUtilitiesMock(),
    search: searchServiceMock.createStartContract(),
    query: queryStartMock,
    dataViews,
    /**
     * @deprecated Use dataViews service instead. All index pattern interfaces were renamed.
     */
    indexPatterns: dataViews,
    nowProvider: createNowProviderMock(),
  };
};

export { createSearchSourceMock } from '../common/search/search_source/mocks';
export { getCalculateAutoTimeExpression } from '../common/search/aggs';

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
};
