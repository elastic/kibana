/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject, SavedObjectConfig } from '../../types';
import { DataViewsContract } from '../../../../data_views/public';

/**
 * After creation or fetching from ES, ensure that the searchSources index indexPattern
 * is an bonafide IndexPattern object.
 *
 * @return {Promise<IndexPattern | null>}
 */
export async function hydrateIndexPattern(
  id: string,
  savedObject: SavedObject,
  dataViews: DataViewsContract,
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

  const indexObj = await dataViews.get(index);
  savedObject.searchSource.setField('index', indexObj);
  return indexObj;
}
