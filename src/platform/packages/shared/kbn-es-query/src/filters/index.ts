/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { FilterCompareOptions, TimeRange } from './helpers';

export {
  dedupFilters,
  uniqFilters,
  compareFilters,
  COMPARE_ALL_OPTIONS,
  cleanFilter,
  isFilter,
  isFilters,
  pinFilter,
  updateFilter,
  isFilterPinned,
  onlyDisabledFiltersChanged,
  enableFilter,
  disableFilter,
  isFilterDisabled,
  toggleFilterNegated,
  toggleFilterDisabled,
  toggleFilterPinned,
  unpinFilter,
  extractTimeFilter,
  extractTimeRange,
  convertRangeFilterToTimeRange,
  updateFilterReferences,
} from './helpers';

export {
  isExistsFilter,
  isMatchAllFilter,
  buildCombinedFilter,
  isCombinedFilter,
  isPhraseFilter,
  isPhrasesFilter,
  isRangeFilter,
  isQueryStringFilter,
  getFilterField,
  buildQueryFilter,
  buildPhrasesFilter,
  buildPhraseFilter,
  buildRangeFilter,
  buildCustomFilter,
  buildFilter,
  buildEmptyFilter,
  buildExistsFilter,
  getRangeScript,
  getPhraseScript,
  getConvertedValueForField,
  getPhraseFilterValue,
  getPhraseFilterField,
  isScriptedPhraseFilter,
  isScriptedRangeFilter,
  getFilterParams,
  BooleanRelation,
} from './build_filters';

export type {
  Query,
  AggregateQuery,
  Filter,
  LatLon,
  FieldFilter,
  FilterMeta,
  ExistsFilter,
  RangeFilter,
  ScriptedRangeFilter,
  PhraseFilter,
  ScriptedPhraseFilter,
  PhrasesFilter,
  RangeFilterMeta,
  MatchAllFilter,
  CustomFilter,
  RangeFilterParams,
  QueryStringFilter,
  CombinedFilter,
  CombinedFilterMeta,
} from './build_filters';

export { FilterStateStore, FILTERS } from './build_filters/types';
