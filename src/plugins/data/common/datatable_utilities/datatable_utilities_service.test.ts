/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewsContract } from 'src/plugins/data_views/common';
import type { DatatableColumn } from 'src/plugins/expressions/common';
import type { AggsCommonStart } from '../search';
import { DatatableUtilitiesService } from './datatable_utilities_service';

describe('DatatableUtilitiesService', () => {
  let aggs: jest.Mocked<AggsCommonStart>;
  let dataViews: jest.Mocked<DataViewsContract>;
  let datatableUtilitiesService: DatatableUtilitiesService;

  beforeEach(() => {
    aggs = {
      createAggConfigs: jest.fn(),
      types: { get: jest.fn() },
    } as unknown as typeof aggs;
    dataViews = {
      get: jest.fn(),
    } as unknown as typeof dataViews;

    datatableUtilitiesService = new DatatableUtilitiesService(aggs, dataViews);
  });

  describe('getDataView', () => {
    it('should return a data view instance', async () => {
      const column = { meta: { index: 'index' } } as DatatableColumn;
      const dataView = {} as ReturnType<DataViewsContract['get']>;
      dataViews.get.mockReturnValue(dataView);

      await expect(datatableUtilitiesService.getDataView(column)).resolves.toBe(dataView);
      expect(dataViews.get).toHaveBeenCalledWith('index');
    });

    it('should return undefined when there is no index metadata', async () => {
      const column = { meta: {} } as DatatableColumn;

      await expect(datatableUtilitiesService.getDataView(column)).resolves.toBeUndefined();
      expect(dataViews.get).not.toHaveBeenCalled();
    });
  });
});
