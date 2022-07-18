/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';

import type { VisTypeTimeseriesVisDataRequest } from '../../../types';
import type { SearchStrategy, SearchCapabilities } from '..';
import type { CachedIndexPatternFetcher } from './cached_index_pattern_fetcher';
import type { IndexPatternValue } from '../../../../common/types';

export interface FieldsFetcherServices {
  indexPatternsService: DataViewsService;
  cachedIndexPatternFetcher: CachedIndexPatternFetcher;
  searchStrategy: SearchStrategy;
  capabilities: SearchCapabilities;
}

export const createFieldsFetcher = (
  req: VisTypeTimeseriesVisDataRequest,
  {
    capabilities,
    indexPatternsService,
    searchStrategy,
    cachedIndexPatternFetcher,
  }: FieldsFetcherServices
) => {
  const fieldsCacheMap = new Map();

  return async (indexPatternValue: IndexPatternValue) => {
    const key = getIndexPatternKey(indexPatternValue);

    if (fieldsCacheMap.has(key)) {
      return fieldsCacheMap.get(key);
    }
    const fetchedIndex = await cachedIndexPatternFetcher(indexPatternValue);

    const fields = await searchStrategy.getFieldsForWildcard(
      fetchedIndex,
      indexPatternsService,
      capabilities
    );

    fieldsCacheMap.set(key, fields);

    return fields;
  };
};
