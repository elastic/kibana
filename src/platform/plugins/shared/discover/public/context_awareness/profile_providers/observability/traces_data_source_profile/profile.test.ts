/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { DataSourceCategory, DataSourceProfileProviderParams } from '../../../profiles';
import { DataSourceType, createDataViewDataSource } from '../../../../../common/data_sources';
import { createTracesDataSourceProfileProvider } from './profile';

describe('tracesDataSourceProfileProvider', () => {
  const tracesDataSourceProfileProvider = createTracesDataSourceProfileProvider();

  const RESOLUTION_MATCH = {
    isMatch: true,
    context: { category: DataSourceCategory.Traces },
  };

  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  it('should match when the data source type is a data view for APM', () => {
    expect(
      tracesDataSourceProfileProvider.resolve({
        dataSource: createDataViewDataSource({ dataViewId: 'apm_static_data_view_id_default' }),
        dataView: {
          getIndexPattern: () => 'traces-*',
        } as unknown as DataView,
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MATCH);

    expect(
      tracesDataSourceProfileProvider.resolve({
        dataSource: createDataViewDataSource({ dataViewId: 'apm_static_data_view_id_custom_view' }),
        dataView: {
          getIndexPattern: () => 'traces-*',
        } as unknown as DataView,
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MATCH);
  });

  it('should NOT match when the data source is not the APM data view', () => {
    expect(
      tracesDataSourceProfileProvider.resolve({
        dataSource: { type: DataSourceType.Esql },
        query: { esql: 'FROM traces' },
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MISMATCH);

    expect(
      tracesDataSourceProfileProvider.resolve({
        dataSource: { type: DataSourceType.Esql },
        query: { esql: 'FROM logs' },
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MISMATCH);

    expect(
      tracesDataSourceProfileProvider.resolve({
        dataSource: createDataViewDataSource({ dataViewId: 'other_view_id' }),
        dataView: { getIndexPattern: () => 'logs-*' } as unknown as DataView,
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MISMATCH);
  });
});
