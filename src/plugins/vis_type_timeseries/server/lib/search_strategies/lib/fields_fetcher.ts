/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { VisTypeTimeseriesVisDataRequest } from '../../../types';
import type { AbstractSearchStrategy, DefaultSearchCapabilities } from '../index';
import type { IndexPatternsService } from '../../../../../data/common';
import type { CachedIndexPatternFetcher } from './cached_index_pattern_fetcher';

export interface FieldsFetcherServices {
  indexPatternsService: IndexPatternsService;
  cachedIndexPatternFetcher: CachedIndexPatternFetcher;
  searchStrategy: AbstractSearchStrategy;
  capabilities: DefaultSearchCapabilities;
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

  return async (index: string) => {
    if (fieldsCacheMap.has(index)) {
      return fieldsCacheMap.get(index);
    }
    const fetchedIndex = await cachedIndexPatternFetcher(index);

    const fields = await searchStrategy.getFieldsForWildcard(
      fetchedIndex,
      indexPatternsService,
      capabilities
    );

    fieldsCacheMap.set(index, fields);

    return fields;
  };
};
