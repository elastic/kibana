/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '../../../core/public';
import { ConfigSchema } from '../config';

export * from './deprecated';

/*
 * Filters:
 */

export { getEsQueryConfig } from '../common';
export { FilterLabel, FilterItem } from './ui';
export { getDisplayValueFromFilter, generateFilters, extractTimeRange } from './query';

/**
 * Exporters (CSV)
 */

import { datatableToCSV, CSV_MIME_TYPE, cellHasFormulas, tableHasFormulas } from '../common';
export const exporters = {
  datatableToCSV,
  CSV_MIME_TYPE,
  cellHasFormulas,
  tableHasFormulas,
};

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
  flattenHitWrapper,
  formatHitProvider,
} from './index_patterns';

export type { IndexPatternsService } from './index_patterns';

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
  flattenHitWrapper,
  formatHitProvider,
};

export {
  IndexPatternsContract,
  IndexPattern,
  IIndexPatternFieldList,
  IndexPatternField,
} from './index_patterns';

export {
  IIndexPattern,
  IFieldType,
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  IndexPatternAttributes,
  UI_SETTINGS,
  TypeMeta as IndexPatternTypeMeta,
  AggregationRestrictions as IndexPatternAggRestrictions,
  IndexPatternSpec,
  IndexPatternLoadExpressionFunctionDefinition,
  fieldList,
  GetFieldsOptions,
  INDEX_PATTERN_SAVED_OBJECT_TYPE,
  AggregationRestrictions,
  IndexPatternType,
} from '../common';

export { DuplicateIndexPatternError } from '../common/index_patterns/errors';

/*
 * Autocomplete query suggestions:
 */

export type {
  QuerySuggestion,
  QuerySuggestionGetFn,
  QuerySuggestionGetFnArgs,
  QuerySuggestionBasic,
  QuerySuggestionField,
  AutocompleteStart,
} from './autocomplete';

export { QuerySuggestionTypes } from './autocomplete';
/*
 * Search:
 */

import {
  // aggs
  CidrMask,
  intervalOptions,
  isDateHistogramBucketAggConfig,
  isNumberType,
  isStringType,
  isType,
  parentPipelineType,
  propFilter,
  siblingPipelineType,
  termsAggFilter,
  dateHistogramInterval,
  InvalidEsCalendarIntervalError,
  InvalidEsIntervalFormatError,
  IpAddress,
  isValidEsInterval,
  isValidInterval,
  parseEsInterval,
  parseInterval,
  toAbsoluteDates,
  boundsDescendingRaw,
  getNumberHistogramIntervalByDatatableColumn,
  getDateHistogramMetaDataByDatatableColumn,
  getResponseInspectorStats,
  // tabify
  tabifyAggResponse,
  tabifyGetColumns,
} from '../common';

export { AggGroupLabels, AggGroupNames, METRIC_TYPES, BUCKET_TYPES } from '../common';

export type {
  // aggs
  AggConfigSerialized,
  AggGroupName,
  AggFunctionsMapping,
  AggParam,
  AggParamOption,
  AggParamType,
  AggConfigOptions,
  EsaggsExpressionFunctionDefinition,
  IAggConfig,
  IAggConfigs,
  IAggType,
  IFieldParamType,
  IMetricAggType,
  OptionedParamType,
  OptionedValueProp,
  ParsedInterval,
  // expressions
  ExecutionContextSearch,
  ExpressionFunctionKibana,
  ExpressionFunctionKibanaContext,
  ExpressionValueSearchContext,
  KibanaContext,
} from '../common';

export type { AggConfigs, AggConfig } from '../common';

export type {
  // search
  ES_SEARCH_STRATEGY,
  EsQuerySortValue,
  IEsSearchRequest,
  IEsSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchSetup,
  ISearchStart,
  ISearchStartSearchSource,
  ISearchGeneric,
  ISearchSource,
  SearchInterceptor,
  SearchInterceptorDeps,
  SearchRequest,
  SearchSourceFields,
  // expression functions and types
  EsdslExpressionFunctionDefinition,
  EsRawResponseExpressionTypeDefinition,
  // errors
  IEsError,
  SearchError,
  SearchTimeoutError,
  TimeoutErrorMode,
  PainlessError,
  Reason,
  WaitUntilNextSessionCompletesOptions,
} from './search';

export {
  parseSearchSourceJSON,
  injectSearchSourceReferences,
  extractSearchSourceReferences,
  getEsPreference,
  getSearchParamsFromRequest,
  noSearchSessionStorageCapabilityMessage,
  SEARCH_SESSIONS_MANAGEMENT_ID,
  waitUntilNextSessionCompletes$,
  isEsError,
  SearchSessionState,
  SortDirection,
} from './search';

export type {
  SearchSource,
  ISessionService,
  SearchSessionInfoProvider,
  ISessionsClient,
  SearchUsageCollector,
} from './search';

export { ISearchOptions, isErrorResponse, isCompleteResponse, isPartialResponse } from '../common';

// Search namespace
export const search = {
  aggs: {
    CidrMask,
    dateHistogramInterval,
    intervalOptions,
    InvalidEsCalendarIntervalError,
    InvalidEsIntervalFormatError,
    IpAddress,
    isDateHistogramBucketAggConfig, // TODO: remove in build_pipeline refactor
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
    boundsDescendingRaw,
    getNumberHistogramIntervalByDatatableColumn,
    getDateHistogramMetaDataByDatatableColumn,
  },
  getResponseInspectorStats,
  tabifyAggResponse,
  tabifyGetColumns,
};

/*
 * UI components
 */

export type {
  SearchBarProps,
  StatefulSearchBarProps,
  IndexPatternSelectProps,
  QueryStringInputProps,
} from './ui';

export { QueryStringInput, SearchBar } from './ui';

/**
 * Types to be shared externally
 * @public
 */
export type { RefreshInterval, TimeRange } from '../common';

export {
  createSavedQueryService,
  connectToQueryState,
  syncQueryStateWithUrl,
  getDefaultQuery,
  FilterManager,
  TimeHistory,
} from './query';

export type {
  QueryState,
  SavedQuery,
  SavedQueryService,
  SavedQueryTimeFilter,
  InputTimeRange,
  TimefilterContract,
  TimeHistoryContract,
  QueryStateChange,
  QueryStart,
  AutoRefreshDoneFn,
} from './query';

export type { AggsStart } from './search/aggs';

export {
  getTime,
  // kbn field types
  castEsToKbnFieldTypeName,
  getKbnTypeNames,
} from '../common';

export { isTimeRange, isQuery } from '../common';

export { ACTION_GLOBAL_APPLY_FILTER, ApplyGlobalFilterActionContext } from './actions';
export { APPLY_FILTER_TRIGGER } from './triggers';

/*
 * Plugin setup
 */

import { DataPublicPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new DataPublicPlugin(initializerContext);
}

export type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  IDataPluginServices,
  DataPublicPluginStartUi,
  DataPublicPluginStartActions,
} from './types';

// Export plugin after all other imports
export type { DataPublicPlugin as DataPlugin };
