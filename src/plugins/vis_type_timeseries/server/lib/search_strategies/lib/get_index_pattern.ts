/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternsService, IndexPattern } from '../../../../../data/server';
import { IndexPatternObject } from '../../../../common/types';
import { convertIndexPatternObjectToStringRepresentation } from '../../../../common/index_patterns_utils';

interface ParsedIndexPattern {
  indexPattern: IndexPattern | undefined | null;
  indexPatternString: string;
}

export const getCachedIndexPatternFetcher = (indexPatternsService: IndexPatternsService) => {
  const cache = new Map();

  return async (indexPatternObject: IndexPatternObject): Promise<ParsedIndexPattern> => {
    const key = convertIndexPatternObjectToStringRepresentation(indexPatternObject);

    if (cache.has(key)) {
      return cache.get(key);
    }

    let indexPattern: ParsedIndexPattern['indexPattern'];
    let indexPatternString: string = '';

    if (!indexPatternObject) {
      indexPattern = await indexPatternsService.getDefault();
    } else {
      if (typeof indexPatternObject === 'string') {
        indexPattern = (await indexPatternsService.find(indexPatternObject)).find(
          (index) => index.title === indexPatternObject
        );

        if (!indexPattern) {
          indexPatternString = indexPatternObject;
        }
      } else if (indexPatternObject.id) {
        indexPattern =
          (await indexPatternsService.get(indexPatternObject.id)) ??
          (await indexPatternsService.getDefault());
      }
    }

    const returnObject = {
      indexPattern,
      indexPatternString: indexPattern?.title ?? indexPatternString,
    };

    cache.set(indexPatternObject, returnObject);

    return returnObject;
  };
};

export type CachedIndexPatternFetcher = ReturnType<typeof getCachedIndexPatternFetcher>;
