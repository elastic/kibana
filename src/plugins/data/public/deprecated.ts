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
import { FilterStateStore } from '../common';
import type {
  CustomFilter,
  EsQueryConfig,
  ExistsFilter,
  IFieldSubType,
  KueryNode,
  MatchAllFilter,
  PhraseFilter,
  PhrasesFilter,
  RangeFilter,
  RangeFilterMeta,
  RangeFilterParams,
} from '../common/es_query';
import {
  buildEmptyFilter,
  buildEsQuery,
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildQueryFilter,
  buildQueryFromFilters,
  buildRangeFilter,
  compareFilters,
  COMPARE_ALL_OPTIONS,
  decorateQuery,
  disableFilter,
  FILTERS,
  fromKueryExpression,
  getPhraseFilterField,
  getPhraseFilterValue,
  isExistsFilter,
  isFilter,
  isFilterPinned,
  isFilters,
  isMatchAllFilter,
  isMissingFilter,
  isPhraseFilter,
  isPhrasesFilter,
  isQueryStringFilter,
  isRangeFilter,
  luceneStringToDsl,
  nodeTypes,
  onlyDisabledFiltersChanged,
  toElasticsearchQuery,
  toggleFilterNegated,
} from '../common/es_query';
import { getEsQueryConfig } from '../common/es_query/get_es_query_config';
import { generateFilters } from './query/filter_manager/lib/generate_filters';
import { getDisplayValueFromFilter } from './query/filter_manager/lib/get_display_value';
import { mapAndFlattenFilters as oldMapAndFlattenFilters } from './query/filter_manager/lib/map_and_flatten_filters';
import {
  changeTimeFilter as oldChangeTimeFilter,
  convertRangeFilterToTimeRangeString as oldConvertRangeFilterToTimeRangeString,
} from './query/timefilter/lib/change_time_filter';
import {
  extractTimeFilter as oldExtractTimeFilter,
  extractTimeRange,
} from './query/timefilter/lib/extract_time_filter';
import { FilterItem, FilterLabel } from './ui/filter_bar';

/**
 * @deprecated  This import will be removed.
 * @removeBy 8.1
 */
const changeTimeFilter = oldChangeTimeFilter;
/**
 * @deprecated  This import will be removed.
 * @removeBy 8.1
 */
const mapAndFlattenFilters = oldMapAndFlattenFilters;
/**
 * @deprecated  This import will be removed.
 * @removeBy 8.1
 */
const extractTimeFilter = oldExtractTimeFilter;
/**
 * @deprecated  This import will be removed.
 * @removeBy 8.1
 */
const convertRangeFilterToTimeRangeString = oldConvertRangeFilterToTimeRangeString;

/**
 * Filter helpers namespace:
 * @deprecated Import helpers from the "@kbn/es-query" package directly instead.
 * @removeBy 8.1
 */
export const esFilters = {
  FilterLabel,
  FilterItem,

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
  isMissingFilter,
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

  changeTimeFilter,
  convertRangeFilterToTimeRangeString,
  mapAndFlattenFilters,
  extractTimeFilter,
  extractTimeRange,
};

/**
 * Deprecated type exports
 */
export type { Filter, Query } from '../common';
export {
  KueryNode,
  RangeFilter,
  RangeFilterMeta,
  RangeFilterParams,
  ExistsFilter,
  PhrasesFilter,
  PhraseFilter,
  CustomFilter,
  MatchAllFilter,
  IFieldSubType,
  EsQueryConfig,
  isFilter,
  isFilters,
};

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
