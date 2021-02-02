/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObject, SavedObjectConfig } from '../../types';
import { IndexPatternsContract } from '../../../../data/public';

/**
 * After creation or fetching from ES, ensure that the searchSources index indexPattern
 * is an bonafide IndexPattern object.
 *
 * @return {Promise<IndexPattern | null>}
 */
export async function hydrateIndexPattern(
  id: string,
  savedObject: SavedObject,
  indexPatterns: IndexPatternsContract,
  config: SavedObjectConfig
) {
  const indexPattern = config.indexPattern;

  if (!savedObject.searchSource) {
    return null;
  }

  const index = id || indexPattern || savedObject.searchSource.getOwnField('index');

  if (typeof index !== 'string' || !index) {
    return null;
  }

  const indexObj = await indexPatterns.get(index);
  savedObject.searchSource.setField('index', indexObj);
  return indexObj;
}
