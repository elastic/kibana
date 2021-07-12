/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { getEsQueryConfig } from './get_es_query_config';

/**
 * Legacy re-exports from package.
 * @deprecated Use imports from `@kbn/es-query` directly
 */
export {
  nodeBuilder,
  isFilters,
  isExistsFilter,
  isMatchAllFilter,
  isGeoBoundingBoxFilter,
  isGeoPolygonFilter,
  isMissingFilter,
  isPhraseFilter,
  isPhrasesFilter,
  isRangeFilter,
  isQueryStringFilter,
  buildQueryFilter,
  buildPhrasesFilter,
  buildPhraseFilter,
  buildRangeFilter,
  buildCustomFilter,
  buildFilter,
  buildEmptyFilter,
  buildExistsFilter,
  toggleFilterNegated,
  Filter,
  ExistsFilter,
  GeoPolygonFilter,
  PhraseFilter,
  MatchAllFilter,
  CustomFilter,
  MissingFilter,
  RangeFilter,
  GeoBoundingBoxFilter,
  KueryNode,
  FilterMeta,
  FilterStateStore,
  FILTERS,
} from '@kbn/es-query';
