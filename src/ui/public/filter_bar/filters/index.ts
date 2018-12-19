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

// The interface the other filters extend
export { MetaFilter } from './meta_filter';

// Helper functions that can be invoked on any filter
export {
  isFilterPinned,
  toggleFilterDisabled,
  toggleFilterNegated,
  toggleFilterPinned,
  enableFilter,
  disableFilter,
  pinFilter,
  unpinFilter,
} from './meta_filter';

// The actual filter types
export { CustomFilter } from './custom_filter';
export { ExistsFilter } from './exists_filter';
export { GeoBoundingBoxFilter } from './geo_bounding_box_filter';
export { GeoPolygonFilter } from './geo_polygon_filter';
export { PhraseFilter } from './phrase_filter';
export { PhrasesFilter } from './phrases_filter';
export { QueryFilter } from './query_filter';
export { RangeFilter } from './range_filter';
