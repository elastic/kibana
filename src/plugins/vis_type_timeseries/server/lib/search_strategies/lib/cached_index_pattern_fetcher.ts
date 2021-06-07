/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getIndexPatternKey, fetchIndexPattern } from '../../../../common/index_patterns_utils';

import type { IndexPatternsService } from '../../../../../data/server';
import type { IndexPatternValue, FetchedIndexPattern } from '../../../../common/types';

export const getCachedIndexPatternFetcher = (
  indexPatternsService: IndexPatternsService,
  fetchKibanaIndexForStringIndexes: boolean = false
) => {
  const cache = new Map();

  return async (indexPatternValue: IndexPatternValue): Promise<FetchedIndexPattern> => {
    const key = getIndexPatternKey(indexPatternValue);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const fetchedIndex = fetchIndexPattern(indexPatternValue, indexPatternsService, {
      fetchKibanaIndexForStringIndexes,
    });

    cache.set(key, fetchedIndex);

    return fetchedIndex;
  };
};

export type CachedIndexPatternFetcher = ReturnType<typeof getCachedIndexPatternFetcher>;
