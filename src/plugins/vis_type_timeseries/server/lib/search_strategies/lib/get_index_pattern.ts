/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternsService, IndexPattern } from '../../../../../data/server';
import { IndexPatternObject } from '../../../../common/types';

interface IndexPatternObjectDependencies {
  indexPatternsService: IndexPatternsService;
}
export async function getIndexPatternObject(
  indexPattern: IndexPatternObject,
  { indexPatternsService }: IndexPatternObjectDependencies
) {
  let indexPatternObject: IndexPattern | undefined | null;
  let indexPatternString: string = '';

  const getIndexPatternFromString = async (v: string) =>
    (await indexPatternsService.find(v)).find((index) => index.title === indexPattern);

  if (!indexPattern) {
    indexPatternObject = await indexPatternsService.getDefault();
  } else {
    if (typeof indexPattern === 'string') {
      indexPatternObject = await getIndexPatternFromString(indexPattern);

      if (!indexPatternObject) {
        indexPatternString = indexPattern;
      }
    } else if (indexPattern.id) {
      indexPatternObject = await indexPatternsService.get(indexPattern.id);

      if (!indexPatternObject && indexPattern.title) {
        indexPatternString = indexPattern.title;
      }
    }
  }

  return {
    indexPatternObject,
    indexPatternString: indexPatternObject?.title ?? indexPatternString,
  };
}
