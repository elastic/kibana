/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getIndexPatternObjectKey,
  fetchIndexPattern,
} from '../../../../common/index_patterns_utils';

import type { IndexPatternsService } from '../../../../../data/server';
import type { IndexPatternObject, FetchedIndexPattern } from '../../../../common/types';

export const getCachedIndexPatternFetcher = (indexPatternsService: IndexPatternsService) => {
  const cache = new Map();

  return async (indexPatternObject: IndexPatternObject): Promise<FetchedIndexPattern> => {
    const key = getIndexPatternObjectKey(indexPatternObject);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const fetchedIndex = fetchIndexPattern(indexPatternObject, indexPatternsService);

    cache.set(indexPatternObject, fetchedIndex);

    return fetchedIndex;
  };
};

export type CachedIndexPatternFetcher = ReturnType<typeof getCachedIndexPatternFetcher>;
