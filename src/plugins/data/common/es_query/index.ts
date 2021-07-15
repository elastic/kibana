/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { getEsQueryConfig } from './get_es_query_config';

// NOTE: Trick to deprecate exports https://stackoverflow.com/a/49152018/372086
import {
  isFilterDisabled as oldIsFilterDisabled,
  disableFilter as oldDisableFilter,
  fromKueryExpression as oldFromKueryExpression,
  toElasticsearchQuery as oldToElasticsearchQuery,
  nodeTypes as oldNodeTypes,
  buildEsQuery as oldBuildEsQuery,
  buildQueryFromFilters as oldBuildQueryFromFilters,
  luceneStringToDsl as oldLuceneStringToDsl,
  decorateQuery as olddecorateQuery,
  getPhraseFilterField as oldgetPhraseFilterField,
  getPhraseFilterValue as oldgetPhraseFilterValue,
  isFilterPinned as oldIsFilterPinned,
  nodeBuilder as oldNodeBuilder,
  isFilters as oldIsFilters,
  isExistsFilter as oldIsExistsFilter,
  isMatchAllFilter as oldIsMatchAllFilter,
  isGeoBoundingBoxFilter as oldIsGeoBoundingBoxFilter,
  isGeoPolygonFilter as oldIsGeoPolygonFilter,
  isMissingFilter as oldIsMissingFilter,
  isPhraseFilter as oldIsPhraseFilter,
  isPhrasesFilter as oldIsPhrasesFilter,
  isRangeFilter as oldIsRangeFilter,
  isQueryStringFilter as oldIsQueryStringFilter,
  buildQueryFilter as oldBuildQueryFilter,
  buildPhrasesFilter as oldBuildPhrasesFilter,
  buildPhraseFilter as oldBuildPhraseFilter,
  buildRangeFilter as oldBuildRangeFilter,
  buildCustomFilter as oldBuildCustomFilter,
  buildFilter as oldBuildFilter,
  buildEmptyFilter as oldBuildEmptyFilter,
  buildExistsFilter as oldBuildExistsFilter,
  toggleFilterNegated as oldtoggleFilterNegated,
  Filter as oldFilter,
  RangeFilterMeta as oldRangeFilterMeta,
  RangeFilterParams as oldRangeFilterParams,
  ExistsFilter as oldExistsFilter,
  GeoPolygonFilter as oldGeoPolygonFilter,
  PhrasesFilter as oldPhrasesFilter,
  PhraseFilter as oldPhraseFilter,
  MatchAllFilter as oldMatchAllFilter,
  CustomFilter as oldCustomFilter,
  MissingFilter as oldMissingFilter,
  RangeFilter as oldRangeFilter,
  GeoBoundingBoxFilter as oldGeoBoundingBoxFilter,
  KueryNode as oldKueryNode,
  FilterMeta as oldFilterMeta,
  FILTERS as oldFILTERS,
  IFieldSubType as oldIFieldSubType,
  EsQueryConfig as oldEsQueryConfig,
  isFilter as oldIsFilter,
  FilterStateStore,
} from '@kbn/es-query';

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isFilter = oldIsFilter;
/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isFilterDisabled = oldIsFilterDisabled;
/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const disableFilter = oldDisableFilter;
/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const fromKueryExpression = oldFromKueryExpression;
/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const toElasticsearchQuery = oldToElasticsearchQuery;
/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const nodeTypes = oldNodeTypes;
/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const buildEsQuery = oldBuildEsQuery;
/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const buildQueryFromFilters = oldBuildQueryFromFilters;
/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const luceneStringToDsl = oldLuceneStringToDsl;
/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const decorateQuery = olddecorateQuery;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const getPhraseFilterField = oldgetPhraseFilterField;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const getPhraseFilterValue = oldgetPhraseFilterValue;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isFilterPinned = oldIsFilterPinned;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const nodeBuilder = oldNodeBuilder;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isFilters = oldIsFilters;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isExistsFilter = oldIsExistsFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isMatchAllFilter = oldIsMatchAllFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isGeoBoundingBoxFilter = oldIsGeoBoundingBoxFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isGeoPolygonFilter = oldIsGeoPolygonFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isMissingFilter = oldIsMissingFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isPhraseFilter = oldIsPhraseFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isPhrasesFilter = oldIsPhrasesFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isRangeFilter = oldIsRangeFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const isQueryStringFilter = oldIsQueryStringFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const buildQueryFilter = oldBuildQueryFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const buildPhrasesFilter = oldBuildPhrasesFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const buildPhraseFilter = oldBuildPhraseFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const buildRangeFilter = oldBuildRangeFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const buildCustomFilter = oldBuildCustomFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const buildFilter = oldBuildFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const buildEmptyFilter = oldBuildEmptyFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const buildExistsFilter = oldBuildExistsFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const toggleFilterNegated = oldtoggleFilterNegated;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
const FILTERS = oldFILTERS;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type Filter = oldFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type RangeFilterMeta = oldRangeFilterMeta;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type RangeFilterParams = oldRangeFilterParams;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type ExistsFilter = oldExistsFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type GeoPolygonFilter = oldGeoPolygonFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type PhrasesFilter = oldPhrasesFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type PhraseFilter = oldPhraseFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type MatchAllFilter = oldMatchAllFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type CustomFilter = oldCustomFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type MissingFilter = oldMissingFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type RangeFilter = oldRangeFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type GeoBoundingBoxFilter = oldGeoBoundingBoxFilter;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type KueryNode = oldKueryNode;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type FilterMeta = oldFilterMeta;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type IFieldSubType = oldIFieldSubType;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */
type EsQueryConfig = oldEsQueryConfig;

/**
 * @deprecated Please import from the package kbn/es-query directly. This import will be deprecated in v8.0.0.
 */

export {
  disableFilter,
  fromKueryExpression,
  toElasticsearchQuery,
  nodeTypes,
  buildEsQuery,
  buildQueryFromFilters,
  luceneStringToDsl,
  decorateQuery,
  getPhraseFilterField,
  getPhraseFilterValue,
  isFilterPinned,
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
  FILTERS,
  isFilter,
  isFilterDisabled,
  FilterStateStore,
  Filter,
  RangeFilterMeta,
  RangeFilterParams,
  ExistsFilter,
  GeoPolygonFilter,
  PhrasesFilter,
  PhraseFilter,
  MatchAllFilter,
  CustomFilter,
  MissingFilter,
  RangeFilter,
  GeoBoundingBoxFilter,
  KueryNode,
  FilterMeta,
  IFieldSubType,
  EsQueryConfig,
};
