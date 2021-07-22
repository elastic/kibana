/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  dedupFilters,
  uniqFilters,
  compareFilters,
  COMPARE_ALL_OPTIONS,
  FilterCompareOptions,
  cleanFilter,
  isFilter,
  isFilters,
  pinFilter,
  isFilterPinned,
  onlyDisabledFiltersChanged,
  enableFilter,
  disableFilter,
  isFilterDisabled,
  toggleFilterNegated,
  toggleFilterDisabled,
  toggleFilterPinned,
  unpinFilter,
} from './helpers';

export {
  isExistsFilter,
  isMatchAllFilter,
  isGeoBoundingBoxFilter,
  isGeoPolygonFilter,
  isMissingFilter,
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
} from './build_filters';

export type {
  Query,
  Filter,
  FilterState,
  LatLon,
  FieldFilter,
  FilterMeta,
  ExistsFilter,
  RangeFilter,
  PhraseFilter,
  PhrasesFilter,
  RangeFilterParams,
  RangeFilterMeta,
  GeoPolygonFilter,
  MatchAllFilter,
  CustomFilter,
  MissingFilter,
  GeoBoundingBoxFilter,
} from './build_filters';

export { FilterStateStore, FILTERS } from './build_filters/types';
