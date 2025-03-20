/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import {
  DataSourceCategory,
  type DataSourceProfileProviderParams,
  SolutionType,
  type RootContext,
} from '../../../profiles';
import { DataSourceType, createDataViewDataSource } from '../../../../../common/data_sources';
import { createTracesDataSourceProfileProvider } from './profile';
import { createContextAwarenessMocks } from '../../../__mocks__';
import type { ContextWithProfileId } from '../../../profile_service';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../consts';

const mockServices = createContextAwarenessMocks().profileProviderServices;

describe('tracesDataSourceProfileProvider', () => {
  const tracesDataSourceProfileProvider = createTracesDataSourceProfileProvider(mockServices);

  const RESOLUTION_MATCH = {
    isMatch: true,
    context: { category: DataSourceCategory.Traces },
  };

  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: OBSERVABILITY_ROOT_PROFILE_ID,
    solutionType: SolutionType.Observability,
  };

  it('should match when the index is for traces', () => {
    expect(
      tracesDataSourceProfileProvider.resolve({
        rootContext: ROOT_CONTEXT,
        dataSource: createDataViewDataSource({ dataViewId: 'apm_static_data_view_id_default' }),
        dataView: {
          getIndexPattern: () => 'traces-*',
        } as unknown as DataView,
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MATCH);

    expect(
      tracesDataSourceProfileProvider.resolve({
        rootContext: ROOT_CONTEXT,
        dataSource: createDataViewDataSource({ dataViewId: 'apm_static_data_view_id_custom_view' }),
        dataView: {
          getIndexPattern: () => 'traces-*',
        } as unknown as DataView,
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MATCH);

    expect(
      tracesDataSourceProfileProvider.resolve({
        rootContext: ROOT_CONTEXT,
        dataSource: createDataViewDataSource({ dataViewId: 'other_view_id' }),
        dataView: { getIndexPattern: () => 'traces-*' } as unknown as DataView,
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MATCH);

    expect(
      tracesDataSourceProfileProvider.resolve({
        rootContext: ROOT_CONTEXT,
        dataSource: { type: DataSourceType.Esql },
        query: { esql: 'FROM traces' },
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MATCH);
  });

  it('should NOT match when the index is not for traces', () => {
    expect(
      tracesDataSourceProfileProvider.resolve({
        rootContext: ROOT_CONTEXT,
        dataSource: { type: DataSourceType.Esql },
        query: { esql: 'FROM logs' },
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MISMATCH);

    expect(
      tracesDataSourceProfileProvider.resolve({
        rootContext: ROOT_CONTEXT,
        dataSource: createDataViewDataSource({ dataViewId: 'other_logs_view_id' }),
        dataView: { getIndexPattern: () => 'logs-*' } as unknown as DataView,
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MISMATCH);
  });

  it("should NOT match when the root context isn't Observability", () => {
    expect(
      tracesDataSourceProfileProvider.resolve({
        rootContext: {
          profileId: 'security-root-profile',
          solutionType: SolutionType.Security,
        },
        dataSource: createDataViewDataSource({ dataViewId: 'other_view_id' }),
        dataView: { getIndexPattern: () => 'traces-*' } as unknown as DataView,
      } as DataSourceProfileProviderParams)
    ).toEqual(RESOLUTION_MISMATCH);
  });
});
