/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Filter as SerializableFilter,
  FilterMeta as SerializableFilterMeta,
} from '@kbn/es-query-server';
import { ExistsFilter } from './exists_filter';
import { PhrasesFilter, PhrasesFilterMeta } from './phrases_filter';
import { PhraseFilter, PhraseFilterMeta, PhraseFilterMetaParams } from './phrase_filter';
import { RangeFilter, RangeFilterMeta, RangeFilterParams } from './range_filter';
import { MatchAllFilter, MatchAllFilterMeta } from './match_all_filter';

export type { AggregateQuery, Query } from '@kbn/es-query-server';

/**
 * A common type for filters supported by this package
 * @public
 **/
export type FieldFilter =
  | ExistsFilter
  | PhraseFilter
  | PhrasesFilter
  | RangeFilter
  | MatchAllFilter;

/**
 * An enum of all types of filters supported by this package
 * @public
 */
export enum FILTERS {
  CUSTOM = 'custom',
  PHRASES = 'phrases',
  PHRASE = 'phrase',
  EXISTS = 'exists',
  MATCH_ALL = 'match_all',
  QUERY_STRING = 'query_string',
  RANGE = 'range',
  RANGE_FROM_VALUE = 'range_from_value',
  SPATIAL_FILTER = 'spatial_filter',
  COMBINED = 'combined',
}

/**
  Filter,
 * An enum to denote whether a filter is specific to an application's context or whether it should be applied globally.
 * @public
 */
export enum FilterStateStore {
  APP_STATE = 'appState',
  GLOBAL_STATE = 'globalState',
}

export type FilterMetaParams =
  | Filter
  | Filter[]
  | RangeFilterMeta
  | RangeFilterParams
  | PhraseFilterMeta
  | PhraseFilterMetaParams
  | PhrasesFilterMeta
  | MatchAllFilterMeta
  | string
  | string[]
  | boolean
  | boolean[]
  | number
  | number[];

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FilterMeta = Omit<SerializableFilterMeta, 'params'> & {
  params?: FilterMetaParams;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Filter = Omit<SerializableFilter, 'meta'> & {
  meta: FilterMeta;
};

/**
 * An interface for a latitude-longitude pair
 * @public
 */
export interface LatLon {
  lat: number;
  lon: number;
}
