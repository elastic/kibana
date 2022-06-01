/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Filters:
 */

import {
  getPhraseFilterField,
  getPhraseFilterValue,
  isExistsFilter,
  isFilterPinned,
  isMatchAllFilter,
  isPhraseFilter,
  isPhrasesFilter,
  isQueryStringFilter,
  isRangeFilter,
  toggleFilterNegated,
  buildEmptyFilter,
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildQueryFilter,
  buildRangeFilter,
  disableFilter,
  fromKueryExpression,
  toElasticsearchQuery,
  nodeTypes,
  buildEsQuery,
  buildQueryFromFilters,
  luceneStringToDsl,
  decorateQuery,
  FILTERS,
  isFilters,
  KueryNode,
  RangeFilter,
  RangeFilterParams,
  ExistsFilter,
  PhraseFilter,
  MatchAllFilter,
  EsQueryConfig,
  FilterStateStore,
  compareFilters,
  COMPARE_ALL_OPTIONS,
  onlyDisabledFiltersChanged,
  getEsQueryConfig,
  TimeRange,
} from '../common';

import {
  getDisplayValueFromFilter,
  generateFilters,
  mapAndFlattenFilters as oldMapAndFlattenFilters,
} from './query';

/**
 * @deprecated  This import will be removed.
 * @removeBy 8.1
 */
const mapAndFlattenFilters = oldMapAndFlattenFilters;

/**
 * Filter helpers namespace:
 * @deprecated Import helpers from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
export const esFilters = {
  FILTERS,
  FilterStateStore,

  buildEmptyFilter,
  buildPhrasesFilter,
  buildExistsFilter,
  buildPhraseFilter,
  buildQueryFilter,
  buildRangeFilter,

  isPhraseFilter,
  isExistsFilter,
  isPhrasesFilter,
  isRangeFilter,
  isMatchAllFilter,
  isQueryStringFilter,
  isFilterPinned,

  toggleFilterNegated,
  disableFilter,
  getPhraseFilterField,
  getPhraseFilterValue,
  getDisplayValueFromFilter,

  compareFilters,
  COMPARE_ALL_OPTIONS,
  generateFilters,
  onlyDisabledFiltersChanged,

  mapAndFlattenFilters,
};

/**
 * Deprecated type exports
 */
export type {
  KueryNode,
  RangeFilter,
  RangeFilterParams,
  ExistsFilter,
  PhraseFilter,
  MatchAllFilter,
  EsQueryConfig,
  TimeRange,
};
export { isFilters };

/**
 * @deprecated Import helpers from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
export const esKuery = {
  nodeTypes,
  fromKueryExpression,
  toElasticsearchQuery,
};

/**
 * @deprecated Import helpers from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
export const esQuery = {
  buildEsQuery,
  getEsQueryConfig,
  buildQueryFromFilters,
  luceneStringToDsl,
  decorateQuery,
};

export type { Filter, Query } from '../common';
