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
export * from './meta_filter';

// The actual filter types
import { CustomFilter } from './custom_filter';
import { ExistsFilter, isExistsFilter } from './exists_filter';
import { GeoBoundingBoxFilter, isGeoBoundingBoxFilter } from './geo_bounding_box_filter';
import { GeoPolygonFilter, isGeoPolygonFilter } from './geo_polygon_filter';
import { PhraseFilter, isPhraseFilter, isScriptedPhraseFilter } from './phrase_filter';
import { PhrasesFilter, isPhrasesFilter } from './phrases_filter';
import { QueryStringFilter, isQueryStringFilter } from './query_string_filter';
import { RangeFilter, isRangeFilter, isScriptedRangeFilter } from './range_filter';
import { MatchAllFilter, isMatchAllFilter } from './match_all_filter';
import { MissingFilter, isMissingFilter } from './missing_filter';

export {
  CustomFilter,
  ExistsFilter,
  isExistsFilter,
  GeoBoundingBoxFilter,
  isGeoBoundingBoxFilter,
  GeoPolygonFilter,
  isGeoPolygonFilter,
  PhraseFilter,
  isPhraseFilter,
  isScriptedPhraseFilter,
  PhrasesFilter,
  isPhrasesFilter,
  QueryStringFilter,
  isQueryStringFilter,
  RangeFilter,
  isRangeFilter,
  isScriptedRangeFilter,
  MatchAllFilter,
  isMatchAllFilter,
  MissingFilter,
  isMissingFilter,
};

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
}
