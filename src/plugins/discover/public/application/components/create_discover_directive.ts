/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Discover } from './discover';

export function createDiscoverDirective(reactDirective: any) {
  return reactDirective(Discover, [
    ['fetch', { watchDepth: 'reference' }],
    ['fetchCounter', { watchDepth: 'reference' }],
    ['fetchError', { watchDepth: 'reference' }],
    ['fieldCounts', { watchDepth: 'reference' }],
    ['histogramData', { watchDepth: 'reference' }],
    ['hits', { watchDepth: 'reference' }],
    ['indexPattern', { watchDepth: 'reference' }],
    ['onAddColumn', { watchDepth: 'reference' }],
    ['onAddFilter', { watchDepth: 'reference' }],
    ['onChangeInterval', { watchDepth: 'reference' }],
    ['onRemoveColumn', { watchDepth: 'reference' }],
    ['onSetColumns', { watchDepth: 'reference' }],
    ['onSort', { watchDepth: 'reference' }],
    ['opts', { watchDepth: 'reference' }],
    ['resetQuery', { watchDepth: 'reference' }],
    ['resultState', { watchDepth: 'reference' }],
    ['rows', { watchDepth: 'reference' }],
    ['searchSource', { watchDepth: 'reference' }],
    ['setColumns', { watchDepth: 'reference' }],
    ['setIndexPattern', { watchDepth: 'reference' }],
    ['showSaveQuery', { watchDepth: 'reference' }],
    ['state', { watchDepth: 'reference' }],
    ['timefilterUpdateHandler', { watchDepth: 'reference' }],
    ['timeRange', { watchDepth: 'reference' }],
    ['topNavMenu', { watchDepth: 'reference' }],
    ['updateQuery', { watchDepth: 'reference' }],
    ['updateSavedQueryId', { watchDepth: 'reference' }],
  ]);
}
