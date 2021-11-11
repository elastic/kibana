/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/109904
/* eslint-disable @kbn/eslint/no_export_all */

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

import {
  isNestedField,
  isFilterable,
  isMultiField,
  getFieldSubtypeNested,
  getFieldSubtypeMulti,
} from '../common';

import {
  ILLEGAL_CHARACTERS_KEY,
  CONTAINS_SPACES_KEY,
  ILLEGAL_CHARACTERS_VISIBLE,
  ILLEGAL_CHARACTERS,
  validateDataView,
} from './data_views';

export type { IndexPatternsService } from './data_views';

// Index patterns namespace:
export const indexPatterns = {
  ILLEGAL_CHARACTERS_KEY,
  CONTAINS_SPACES_KEY,
  ILLEGAL_CHARACTERS_VISIBLE,
  ILLEGAL_CHARACTERS,
  isFilterable,
  isNestedField,
  isMultiField,
  getFieldSubtypeMulti,
  getFieldSubtypeNested,
  validate: validateDataView,
};

export type { IndexPatternsContract, DataViewsContract, TypeMeta } from './data_views';
export { IndexPattern, IndexPatternField } from './data_views';

export type {
  IIndexPattern,
  IFieldType,
  IndexPatternAttributes,
  AggregationRestrictions as IndexPatternAggRestrictions,
  IndexPatternSpec,
  IndexPatternLoadExpressionFunctionDefinition,
  GetFieldsOptions,
  AggregationRestrictions,
  IndexPatternListItem,
} from '../common';
export {
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  UI_SETTINGS,
  fieldList,
  IndexPatternType,
  DuplicateDataViewError,
} from '../common';

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
  checkColumnForPrecisionError,
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
  SearchRequest,
  SearchSourceFields,
  // errors
  IEsError,
  Reason,
  WaitUntilNextSessionCompletesOptions,
} from './search';

export {
  parseSearchSourceJSON,
  injectSearchSourceReferences,
  extractSearchSourceReferences,
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
  // TODO: remove these when data_enhanced is merged into data
  ISessionService,
  SearchSessionInfoProvider,
  ISessionsClient,
  SearchUsageCollector,
} from './search';

export type { ISearchOptions } from '../common';
export { isErrorResponse, isCompleteResponse, isPartialResponse } from '../common';

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
  checkColumnForPrecisionError,
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

export type { ApplyGlobalFilterActionContext } from './actions';
export { ACTION_GLOBAL_APPLY_FILTER } from './actions';
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
