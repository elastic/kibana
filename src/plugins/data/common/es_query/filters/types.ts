/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
