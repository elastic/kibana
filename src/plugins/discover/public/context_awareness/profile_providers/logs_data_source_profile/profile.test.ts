/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createStubIndexPattern } from '@kbn/data-views-plugin/common/data_view.stub';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../common/data_sources';
import { DataSourceCategory } from '../../profiles';
import { createContextAwarenessMocks } from '../../__mocks__';
import { createLogsDataSourceProfileProvider } from './profile';

const mockServices = createContextAwarenessMocks().profileProviderServices;

describe('logsDataSourceProfileProvider', () => {
  const logsDataSourceProfileProvider = createLogsDataSourceProfileProvider(mockServices);
  const VALID_INDEX_PATTERN = 'logs-nginx.access-*';
  const MIXED_INDEX_PATTERN = 'logs-nginx.access-*,metrics-*';
  const INVALID_INDEX_PATTERN = 'my_source-access-*';

  const RESOLUTION_MATCH = {
    isMatch: true,
    context: { category: DataSourceCategory.Logs },
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  it('should match ES|QL sources with an allowed index pattern in its query', () => {
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createEsqlDataSource(),
        query: { esql: `from ${VALID_INDEX_PATTERN}` },
      })
    ).toEqual(RESOLUTION_MATCH);
  });

  it('should NOT match ES|QL sources with a mixed or not allowed index pattern in its query', () => {
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createEsqlDataSource(),
        query: { esql: `from ${INVALID_INDEX_PATTERN}` },
      })
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createEsqlDataSource(),
        query: { esql: `from ${MIXED_INDEX_PATTERN}` },
      })
    ).toEqual(RESOLUTION_MISMATCH);
  });

  it('should match data view sources with an allowed index pattern', () => {
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createDataViewDataSource({ dataViewId: VALID_INDEX_PATTERN }),
        dataView: createStubIndexPattern({ spec: { title: VALID_INDEX_PATTERN } }),
      })
    ).toEqual(RESOLUTION_MATCH);
  });

  it('should NOT match data view sources with a mixed or not allowed index pattern', () => {
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createDataViewDataSource({ dataViewId: INVALID_INDEX_PATTERN }),
        dataView: createStubIndexPattern({ spec: { title: INVALID_INDEX_PATTERN } }),
      })
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createDataViewDataSource({ dataViewId: MIXED_INDEX_PATTERN }),
        dataView: createStubIndexPattern({ spec: { title: MIXED_INDEX_PATTERN } }),
      })
    ).toEqual(RESOLUTION_MISMATCH);
  });
});
