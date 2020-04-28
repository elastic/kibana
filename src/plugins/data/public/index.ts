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

import './index.scss';

import { PluginInitializerContext } from '../../../core/public';

/*
 * Filters:
 */

import {
  buildEmptyFilter,
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildQueryFilter,
  buildRangeFilter,
  disableFilter,
  FILTERS,
  FilterStateStore,
  getDisplayValueFromFilter,
  getPhraseFilterField,
  getPhraseFilterValue,
  isExistsFilter,
  isFilterPinned,
  isMatchAllFilter,
  isMissingFilter,
  isPhraseFilter,
  isPhrasesFilter,
  isQueryStringFilter,
  isRangeFilter,
  toggleFilterNegated,
  compareFilters,
  COMPARE_ALL_OPTIONS,
} from '../common';

import { FilterLabel } from './ui/filter_bar';

import {
  generateFilters,
  onlyDisabledFiltersChanged,
  changeTimeFilter,
  mapAndFlattenFilters,
  extractTimeFilter,
} from './query';

// Filter helpers namespace:
export const esFilters = {
  FilterLabel,

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
  mapAndFlattenFilters,
  extractTimeFilter,
};

export {
  RangeFilter,
  RangeFilterMeta,
  RangeFilterParams,
  ExistsFilter,
  PhrasesFilter,
  PhraseFilter,
  CustomFilter,
  MatchAllFilter,
} from '../common';

/*
 * esQuery and esKuery:
 */

import {
  fromKueryExpression,
  toElasticsearchQuery,
  nodeTypes,
  buildEsQuery,
  getEsQueryConfig,
  buildQueryFromFilters,
  luceneStringToDsl,
  decorateQuery,
} from '../common';

export const esKuery = {
  nodeTypes,
  fromKueryExpression,
  toElasticsearchQuery,
};

export const esQuery = {
  buildEsQuery,
  getEsQueryConfig,
  buildQueryFromFilters,
  luceneStringToDsl,
  decorateQuery,
};

export { EsQueryConfig, KueryNode } from '../common';

/*
 * Field Formatters:
 */

import {
  FieldFormat,
  FieldFormatsRegistry,
  DEFAULT_CONVERTER_COLOR,
  HTML_CONTEXT_TYPE,
  TEXT_CONTEXT_TYPE,
  FIELD_FORMAT_IDS,
  BoolFormat,
  BytesFormat,
  ColorFormat,
  DateNanosFormat,
  DurationFormat,
  IpFormat,
  NumberFormat,
  PercentFormat,
  RelativeDateFormat,
  SourceFormat,
  StaticLookupFormat,
  UrlFormat,
  StringFormat,
  TruncateFormat,
  serializeFieldFormat,
} from '../common/field_formats';

import { DateFormat } from './field_formats';
export { baseFormattersPublic } from './field_formats';

// Field formats helpers namespace:
export const fieldFormats = {
  FieldFormat,
  FieldFormatsRegistry, // exported only for tests. Consider mock.

  serialize: serializeFieldFormat,

  DEFAULT_CONVERTER_COLOR,
  HTML_CONTEXT_TYPE,
  TEXT_CONTEXT_TYPE,
  FIELD_FORMAT_IDS,

  BoolFormat,
  BytesFormat,
  ColorFormat,
  DateFormat,
  DateNanosFormat,
  DurationFormat,
  IpFormat,
  NumberFormat,
  PercentFormat,
  RelativeDateFormat,
  SourceFormat,
  StaticLookupFormat,
  UrlFormat,
  StringFormat,
  TruncateFormat,
};

export {
  IFieldFormat,
  FieldFormatInstanceType,
  IFieldFormatsRegistry,
  FieldFormatsContentType,
  FieldFormatsGetConfigFn,
  FieldFormatConfig,
  FieldFormatId,
  FieldFormat,
} from '../common';

/*
 * Index patterns:
 */

import { isNestedField, isFilterable } from '../common';

import {
  ILLEGAL_CHARACTERS_KEY,
  CONTAINS_SPACES_KEY,
  ILLEGAL_CHARACTERS_VISIBLE,
  ILLEGAL_CHARACTERS,
  isDefault,
  validateIndexPattern,
  getFromSavedObject,
  flattenHitWrapper,
  getRoutes,
  formatHitProvider,
} from './index_patterns';

// Index patterns namespace:
export const indexPatterns = {
  ILLEGAL_CHARACTERS_KEY,
  CONTAINS_SPACES_KEY,
  ILLEGAL_CHARACTERS_VISIBLE,
  ILLEGAL_CHARACTERS,
  isDefault,
  isFilterable,
  isNestedField,
  validate: validateIndexPattern,
  getFromSavedObject,
  flattenHitWrapper,
  // TODO: exported only in stub_index_pattern test. Move into data plugin and remove export.
  getRoutes,
  formatHitProvider,
};

export {
  IndexPatternsContract,
  IndexPattern,
  Field as IndexPatternField,
  TypeMeta as IndexPatternTypeMeta,
  AggregationRestrictions as IndexPatternAggRestrictions,
  // TODO: exported only in stub_index_pattern test. Move into data plugin and remove export.
  FieldList as IndexPatternFieldList,
  Field,
} from './index_patterns';

export {
  IIndexPattern,
  IFieldType,
  IFieldSubType,
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  IndexPatternAttributes,
} from '../common';

/*
 * Autocomplete query suggestions:
 */

export {
  QuerySuggestion,
  QuerySuggestionTypes,
  QuerySuggestionGetFn,
  QuerySuggestionGetFnArgs,
  QuerySuggestionBasic,
  QuerySuggestionField,
} from './autocomplete';

/*
 * Search:
 */

import {
  // aggs
  AggConfigs,
  aggTypeFilters,
  aggGroupNamesMap,
  CidrMask,
  convertDateRangeToString,
  convertIPRangeToString,
  intervalOptions, // only used in Discover
  isDateHistogramBucketAggConfig,
  isNumberType,
  isStringType,
  isType,
  parentPipelineType,
  propFilter,
  siblingPipelineType,
  termsAggFilter,
  // expressions utils
  getRequestInspectorStats,
  getResponseInspectorStats,
  // tabify
  tabifyAggResponse,
  tabifyGetColumns,
} from './search';

import {
  dateHistogramInterval,
  InvalidEsCalendarIntervalError,
  InvalidEsIntervalFormatError,
  isValidEsInterval,
  isValidInterval,
  parseEsInterval,
  parseInterval,
  toAbsoluteDates,
} from '../common';

export { ParsedInterval } from '../common';

export {
  // aggs
  AggGroupNames,
  AggParam, // only the type is used externally, only in vis editor
  AggParamOption, // only the type is used externally
  AggParamType,
  AggTypeFieldFilters, // TODO convert to interface
  AggTypeFilters, // TODO convert to interface
  AggConfigOptions,
  BUCKET_TYPES,
  DateRangeKey, // only used in field formatter deserialization, which will live in data
  IAggConfig,
  IAggConfigs,
  IAggGroupNames,
  IAggType,
  IFieldParamType,
  IMetricAggType,
  IpRangeKey, // only used in field formatter deserialization, which will live in data
  METRIC_TYPES,
  OptionedParamEditorProps, // only type is used externally
  OptionedParamType,
  OptionedValueProp, // only type is used externally
  // search
  ES_SEARCH_STRATEGY,
  SYNC_SEARCH_STRATEGY,
  getEsPreference,
  getSearchErrorType,
  ISearchContext,
  TSearchStrategyProvider,
  ISearchStrategy,
  ISearch,
  ISearchOptions,
  IRequestTypesMap,
  IResponseTypesMap,
  ISearchGeneric,
  IEsSearchResponse,
  IEsSearchRequest,
  ISyncSearchRequest,
  IKibanaSearchResponse,
  IKibanaSearchRequest,
  SearchRequest,
  SearchResponse,
  SearchError,
  ISearchSource,
  SearchSourceFields,
  EsQuerySortValue,
  SortDirection,
  FetchOptions,
  // tabify
  TabbedAggColumn,
  TabbedAggRow,
  TabbedTable,
  SearchInterceptor,
  RequestTimeoutError,
} from './search';

// Search namespace
export const search = {
  aggs: {
    AggConfigs,
    aggGroupNamesMap,
    aggTypeFilters,
    CidrMask,
    convertDateRangeToString,
    convertIPRangeToString,
    dateHistogramInterval,
    intervalOptions, // only used in Discover
    InvalidEsCalendarIntervalError,
    InvalidEsIntervalFormatError,
    isDateHistogramBucketAggConfig,
    isNumberType,
    isStringType,
    isType,
    isValidEsInterval,
    isValidInterval,
    parentPipelineType,
    parseEsInterval,
    parseInterval,
    propFilter,
    siblingPipelineType,
    termsAggFilter,
    toAbsoluteDates,
  },
  getRequestInspectorStats,
  getResponseInspectorStats,
  tabifyAggResponse,
  tabifyGetColumns,
};

/*
 * UI components
 */

export {
  SearchBar,
  SearchBarProps,
  StatefulSearchBarProps,
  FilterBar,
  QueryStringInput,
  IndexPatternSelect,
} from './ui';

/**
 * Types to be shared externally
 * @public
 */
export { Filter, Query, RefreshInterval, TimeRange } from '../common';

export {
  createSavedQueryService,
  connectToQueryState,
  syncQueryStateWithUrl,
  QueryState,
  getTime,
  getQueryLog,
  getDefaultQuery,
  FilterManager,
  SavedQuery,
  SavedQueryService,
  SavedQueryTimeFilter,
  InputTimeRange,
  TimeHistory,
  TimefilterContract,
  TimeHistoryContract,
} from './query';

export {
  // kbn field types
  castEsToKbnFieldTypeName,
  getKbnTypeNames,
} from '../common';

/*
 * Plugin setup
 */

import { DataPublicPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DataPublicPlugin(initializerContext);
}

export { DataPublicPluginSetup, DataPublicPluginStart, IDataPluginServices } from './types';

// Export plugin after all other imports
export { DataPublicPlugin as Plugin };
