/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { DiscoverLegacy } from './discover_legacy';

export function createDiscoverLegacyDirective(reactDirective: any) {
  return reactDirective(DiscoverLegacy, [
    ['fetch', { watchDepth: 'reference' }],
    ['fetchCounter', { watchDepth: 'reference' }],
    ['fetchError', { watchDepth: 'reference' }],
    ['fieldCounts', { watchDepth: 'reference' }],
    ['histogramData', { watchDepth: 'reference' }],
    ['hits', { watchDepth: 'reference' }],
    ['indexPattern', { watchDepth: 'reference' }],
    ['minimumVisibleRows', { watchDepth: 'reference' }],
    ['onAddColumn', { watchDepth: 'reference' }],
    ['onAddFilter', { watchDepth: 'reference' }],
    ['onChangeInterval', { watchDepth: 'reference' }],
    ['onMoveColumn', { watchDepth: 'reference' }],
    ['onRemoveColumn', { watchDepth: 'reference' }],
    ['onSetColumns', { watchDepth: 'reference' }],
    ['onSkipBottomButtonClick', { watchDepth: 'reference' }],
    ['onSort', { watchDepth: 'reference' }],
    ['opts', { watchDepth: 'reference' }],
    ['resetQuery', { watchDepth: 'reference' }],
    ['resultState', { watchDepth: 'reference' }],
    ['rows', { watchDepth: 'reference' }],
    ['savedSearch', { watchDepth: 'reference' }],
    ['searchSource', { watchDepth: 'reference' }],
    ['setIndexPattern', { watchDepth: 'reference' }],
    ['showSaveQuery', { watchDepth: 'reference' }],
    ['state', { watchDepth: 'reference' }],
    ['timefilterUpdateHandler', { watchDepth: 'reference' }],
    ['timeRange', { watchDepth: 'reference' }],
    ['topNavMenu', { watchDepth: 'reference' }],
    ['updateQuery', { watchDepth: 'reference' }],
    ['updateSavedQueryId', { watchDepth: 'reference' }],
    ['useNewFieldsApi', { watchDepth: 'reference' }],
  ]);
}
