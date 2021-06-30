/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  RANGE_FROM_VALUE = 'range_from_value',
  GEO_BOUNDING_BOX = 'geo_bounding_box',
  GEO_POLYGON = 'geo_polygon',
  SPATIAL_FILTER = 'spatial_filter',
}

export enum FilterStateStore {
  APP_STATE = 'appState',
  GLOBAL_STATE = 'globalState',
}

// eslint-disable-next-line
export type FilterState = {
  store: FilterStateStore;
};

// eslint-disable-next-line
export type FilterMeta = {
  alias: string | null;
  disabled: boolean;
  negate: boolean;
  // controlledBy is there to identify who owns the filter
  controlledBy?: string;
  // index and type are optional only because when you create a new filter, there are no defaults
  index?: string;
  isMultiIndex?: boolean;
  type?: string;
  key?: string;
  params?: any;
  value?: string;
};

// eslint-disable-next-line
export type Filter = {
  $state?: FilterState;
  meta: FilterMeta;
  query?: any; // TODO: can we use the Query type her?
};

// eslint-disable-next-line
export type Query = {
  query: string | { [key: string]: any };
  language: string;
};

export interface LatLon {
  lat: number;
  lon: number;
}
