/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext } from '@kbn/core/public';
import type { ConfigSchema } from '../server/config';

/*
 * Filters:
 */

export { getEsQueryConfig } from '../common';
export {
  getDisplayValueFromFilter,
  getFieldDisplayValueFromFilter,
  generateFilters,
  getIndexPatternFromFilter,
} from './query';

export { convertIntervalToEsInterval } from '../common/search/aggs/buckets/lib/time_buckets/calc_es_interval';
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

export type { DataViewsContract, TypeMeta } from './data_views';

export type {
  AggregationRestrictions as IndexPatternAggRestrictions,
  IndexPatternLoadExpressionFunctionDefinition,
  GetFieldsOptions,
  AggregationRestrictions,
  DataViewListItem,
} from '../common';
export {
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  UI_SETTINGS,
  fieldList,
  DuplicateDataViewError,
} from '../common';

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
  getResponseInspectorStats,
  calcAutoIntervalLessThan,
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
  ExpressionFunctionKql,
  ExpressionFunctionLucene,
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
  ISearchSetup,
  ISearchStart,
  ISearchStartSearchSource,
  ISearchSource,
  SearchRequest,
  SearchSourceFields,
  SerializedSearchSourceFields,
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
  SearchSource,
  SearchSessionState,
  SortDirection,
} from './search';

export type {
  // TODO: remove these when data_enhanced is merged into data
  ISessionService,
  SearchSessionInfoProvider,
  ISessionsClient,
  SearchUsageCollector,
} from './search';

export { isRunningResponse } from '../common';

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
    calcAutoIntervalLessThan,
  },
  getResponseInspectorStats,
  tabifyAggResponse,
  tabifyGetColumns,
};

/*
 * UI components
 */

/**
 * Types to be shared externally
 * @public
 */
export type { RefreshInterval } from '../common';

export {
  createSavedQueryService,
  connectToQueryState,
  syncQueryStateWithUrl,
  syncGlobalQueryStateWithUrl,
  getDefaultQuery,
  FilterManager,
  TimeHistory,
  getQueryLog,
  mapAndFlattenFilters,
  QueryService,
} from './query';

export { NowProvider } from './now_provider';
export type { NowProviderInternalContract, NowProviderPublicContract } from './now_provider';

export type {
  QueryState,
  QueryState$,
  SavedQuery,
  SavedQueryService,
  SavedQueryTimeFilter,
  TimefilterContract,
  TimeHistoryContract,
  QueryStateChange,
  QueryStart,
  AutoRefreshDoneFn,
  PersistedLog,
  QueryStringContract,
  QuerySetup,
  TimefilterSetup,
  GlobalQueryStateFromUrl,
} from './query';

export type { AggsStart } from './search/aggs';

export { getTime } from '../common';

export type { SavedObject } from '../common';

export { isTimeRange, isQuery, flattenHit, calculateBounds, tabifyAggResponse } from '../common';

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
  DataPublicPluginStartActions,
} from './types';

// Export plugin after all other imports
export type { DataPublicPlugin as DataPlugin };
