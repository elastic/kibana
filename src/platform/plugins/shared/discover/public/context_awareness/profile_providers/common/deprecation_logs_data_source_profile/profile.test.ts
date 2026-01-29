/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStubIndexPattern } from '@kbn/data-views-plugin/common/data_view.stub';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import type { RootContext } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import { createDeprecationLogsDataSourceProfileProvider } from './profile';
import type { ContextWithProfileId } from '../../../profile_service';
import { DEPRECATION_LOGS_PROFILE_ID } from './consts';

describe('deprecationLogsProfileProvider', () => {
  const deprecationLogsProfileProvider = createDeprecationLogsDataSourceProfileProvider();
  const VALID_INDEX_PATTERN = '.logs-deprecation.elasticsearch-default';
  const VALID_MIXED_INDEX_PATTERN =
    '.logs-deprecation.elasticsearch-default,.logs-deprecation.abc,.logs-deprecation.def';
  const INVALID_MIXED_INDEX_PATTERN = '.logs-deprecation.elasticsearch-default,metrics-*';
  const INVALID_INDEX_PATTERN = 'my_source-access-*';
  const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: DEPRECATION_LOGS_PROFILE_ID,
    solutionType: SolutionType.Default,
  };
  const RESOLUTION_MATCH = {
    isMatch: true,
    context: {
      category: DataSourceCategory.Logs,
    },
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  it('should match data view sources with an allowed index pattern', () => {
    const result = deprecationLogsProfileProvider.resolve({
      rootContext: ROOT_CONTEXT,
      dataSource: createDataViewDataSource({ dataViewId: VALID_INDEX_PATTERN }),
      dataView: createStubIndexPattern({ spec: { title: VALID_INDEX_PATTERN } }),
    });
    expect(result).toEqual(RESOLUTION_MATCH);
  });

  it('should match data view sources with a mixed pattern containing allowed index patterns', () => {
    const result = deprecationLogsProfileProvider.resolve({
      rootContext: ROOT_CONTEXT,
      dataSource: createDataViewDataSource({ dataViewId: VALID_MIXED_INDEX_PATTERN }),
      dataView: createStubIndexPattern({ spec: { title: VALID_MIXED_INDEX_PATTERN } }),
    });
    expect(result).toEqual(RESOLUTION_MATCH);
  });

  it('should NOT match data view sources with not allowed index pattern', () => {
    const result = deprecationLogsProfileProvider.resolve({
      rootContext: ROOT_CONTEXT,
      dataSource: createDataViewDataSource({ dataViewId: INVALID_INDEX_PATTERN }),
      dataView: createStubIndexPattern({ spec: { title: INVALID_INDEX_PATTERN } }),
    });
    expect(result).toEqual(RESOLUTION_MISMATCH);
  });

  it('should NOT match data view sources with a mixed pattern containing not allowed index patterns', () => {
    const result = deprecationLogsProfileProvider.resolve({
      rootContext: ROOT_CONTEXT,
      dataSource: createDataViewDataSource({ dataViewId: INVALID_MIXED_INDEX_PATTERN }),
      dataView: createStubIndexPattern({ spec: { title: INVALID_MIXED_INDEX_PATTERN } }),
    });
    expect(result).toEqual(RESOLUTION_MISMATCH);
  });
});
