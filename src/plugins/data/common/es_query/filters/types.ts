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

import { ExistsFilter } from './exists_filter';
import { GeoBoundingBoxFilter } from './geo_bounding_box_filter';
import { GeoPolygonFilter } from './geo_polygon_filter';
import { PhrasesFilter } from './phrases_filter';
import { PhraseFilter } from './phrase_filter';
import { RangeFilter } from './range_filter';
import { MatchAllFilter } from './match_all_filter';
import { MissingFilter } from './missing_filter';

// Any filter associated with a field (used in the filter bar/editor)
export type FieldFilter =
  | ExistsFilter
  | GeoBoundingBoxFilter
  | GeoPolygonFilter
  | PhraseFilter
  | PhrasesFilter
  | RangeFilter
  | MatchAllFilter
  | MissingFilter;

export enum FILTERS {
  CUSTOM = 'custom',
  PHRASES = 'phrases',
  PHRASE = 'phrase',
  EXISTS = 'exists',
  MATCH_ALL = 'match_all',
  MISSING = 'missing',
  QUERY_STRING = 'query_string',
  RANGE = 'range',
  GEO_BOUNDING_BOX = 'geo_bounding_box',
  GEO_POLYGON = 'geo_polygon',
  SPATIAL_FILTER = 'spatial_filter',
}
