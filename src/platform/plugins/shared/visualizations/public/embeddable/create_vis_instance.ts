/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializedVis } from '../vis';
import { createVisAsync } from '../vis_async';
import { getSavedSearch } from '../services';

export const createVisInstance = async (serializedVis: SerializedVis) => {
  const vis = await createVisAsync(serializedVis.type, serializedVis);
  if (serializedVis.data.savedSearchId) {
    const savedSearch = await getSavedSearch().get(serializedVis.data.savedSearchId);
    const indexPattern = savedSearch.searchSource.getField('index');
    if (indexPattern) {
      vis.data.indexPattern = indexPattern;
      vis.data.searchSource?.setField('index', indexPattern);
    }
  }
  return vis;
};
