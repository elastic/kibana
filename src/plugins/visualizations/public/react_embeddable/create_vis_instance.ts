/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { SerializedVis } from '../vis';
import { createVisAsync } from '../vis_async';
import { getSearch } from '../services';

export const createVisInstance = async (serializedVis: SerializedVis, indexPatternId?: string) => {
  const vis = await createVisAsync(serializedVis.type, serializedVis);
  if (indexPatternId) {
    const indexPattern = { id: indexPatternId } as DataView;
    vis.data.indexPattern = indexPattern;
    vis.data.searchSource?.setField('index', indexPattern);
    vis.data.aggs = getSearch().aggs.createAggConfigs(indexPattern, serializedVis.data.aggs);
  }
  return vis;
};
