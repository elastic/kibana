/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternsService, IndexPattern } from '../../../../../data/server';

interface IndexPatternObjectDependencies {
  indexPatternsService: IndexPatternsService;
}
export async function getIndexPatternObject(
  indexPatternString: string,
  { indexPatternsService }: IndexPatternObjectDependencies
) {
  let indexPatternObject: IndexPattern | undefined | null;

  if (!indexPatternString) {
    indexPatternObject = await indexPatternsService.getDefault();
  } else {
    indexPatternObject = (await indexPatternsService.find(indexPatternString)).find(
      (index) => index.title === indexPatternString
    );
  }

  return {
    indexPatternObject,
    indexPatternString: indexPatternObject?.title || indexPatternString || '',
  };
}
