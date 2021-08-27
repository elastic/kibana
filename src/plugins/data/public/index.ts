/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { CSV_MIME_TYPE, datatableToCSV } from '../common/exports/export_csv';
import { cellHasFormulas, tableHasFormulas } from '../common/exports/formula_checks';
import { isFilterable, isNestedField } from '../common/index_patterns/fields/utils';
import { flattenHitWrapper } from '../common/index_patterns/index_patterns/flatten_hit';
import { isDefault } from '../common/index_patterns/lib/is_default';
import {
  CONTAINS_SPACES_KEY,
  ILLEGAL_CHARACTERS,
  ILLEGAL_CHARACTERS_KEY,
  ILLEGAL_CHARACTERS_VISIBLE,
} from '../common/index_patterns/lib/types';
import { validateIndexPattern } from '../common/index_patterns/lib/validate_index_pattern';
import { isDateHistogramBucketAggConfig } from '../common/search/aggs/buckets/date_histogram';
import { CidrMask } from '../common/search/aggs/buckets/lib/cidr_mask';
import { boundsDescendingRaw } from '../common/search/aggs/buckets/lib/time_buckets/calc_auto_interval';
import {
  isNumberType,
  isStringType,
  isType,
} from '../common/search/aggs/buckets/migrate_include_exclude_format';
import { termsAggFilter } from '../common/search/aggs/buckets/terms';
import { intervalOptions } from '../common/search/aggs/buckets/_interval_options';
import { parentPipelineType } from '../common/search/aggs/metrics/lib/parent_pipeline_agg_helper';
import { siblingPipelineType } from '../common/search/aggs/metrics/lib/sibling_pipeline_agg_helper';
import { dateHistogramInterval } from '../common/search/aggs/utils/date_interval_utils/date_histogram_interval';
import { InvalidEsCalendarIntervalError } from '../common/search/aggs/utils/date_interval_utils/invalid_es_calendar_interval_error';
import { InvalidEsIntervalFormatError } from '../common/search/aggs/utils/date_interval_utils/invalid_es_interval_format_error';
import { isValidEsInterval } from '../common/search/aggs/utils/date_interval_utils/is_valid_es_interval';
import { isValidInterval } from '../common/search/aggs/utils/date_interval_utils/is_valid_interval';
import { parseEsInterval } from '../common/search/aggs/utils/date_interval_utils/parse_es_interval';
import { parseInterval } from '../common/search/aggs/utils/date_interval_utils/parse_interval';
import { toAbsoluteDates } from '../common/search/aggs/utils/date_interval_utils/to_absolute_dates';
import { getDateHistogramMetaDataByDatatableColumn } from '../common/search/aggs/utils/get_date_histogram_meta';
import { getNumberHistogramIntervalByDatatableColumn } from '../common/search/aggs/utils/get_number_histogram_interval';
import { IpAddress } from '../common/search/aggs/utils/ip_address';
import { propFilter } from '../common/search/aggs/utils/prop_filter';
import { getResponseInspectorStats } from '../common/search/search_source/inspect/inspector_stats';
import { tabifyGetColumns } from '../common/search/tabify/get_columns';
import { tabifyAggResponse } from '../common/search/tabify/tabify';
import type { ConfigSchema } from '../config';
import { DataPublicPlugin } from './plugin';

/*
 * Filters:
 */
export {
  AggGroupLabels,
  AggGroupNames,
  AggregationRestrictions,
  AggregationRestrictions as IndexPatternAggRestrictions,
  BUCKET_TYPES,
  // kbn field types
  castEsToKbnFieldTypeName,
  ES_FIELD_TYPES,
  fieldList,
  getEsQueryConfig,
  GetFieldsOptions,
  getKbnTypeNames,
  getTime,
  IFieldType,
  IIndexPattern,
  IndexPatternAttributes,
  IndexPatternListItem,
  IndexPatternLoadExpressionFunctionDefinition,
  IndexPatternSpec,
  IndexPatternType,
  INDEX_PATTERN_SAVED_OBJECT_TYPE,
  isCompleteResponse,
  ISearchOptions,
  isErrorResponse,
  isPartialResponse,
  isQuery,
  isTimeRange,
  KBN_FIELD_TYPES,
  METRIC_TYPES,
  UI_SETTINGS,
} from '../common';
export type {
  AggConfig,
  AggConfigOptions,
  AggConfigs,
  // aggs
  AggConfigSerialized,
  AggFunctionsMapping,
  AggGroupName,
  AggParam,
  AggParamOption,
  AggParamType,
  EsaggsExpressionFunctionDefinition,
  // expressions
  ExecutionContextSearch,
  ExpressionFunctionKibana,
  ExpressionFunctionKibanaContext,
  ExpressionValueSearchContext,
  IAggConfig,
  IAggConfigs,
  IAggType,
  IFieldParamType,
  IMetricAggType,
  KibanaContext,
  OptionedParamType,
  OptionedValueProp,
  ParsedInterval,
  RefreshInterval,
  TimeRange,
} from '../common';
export { DuplicateIndexPatternError } from '../common/index_patterns/errors';
export { ACTION_GLOBAL_APPLY_FILTER, ApplyGlobalFilterActionContext } from './actions';
export { QuerySuggestionTypes } from './autocomplete';
/*
 * Autocomplete query suggestions:
 */
export type {
  AutocompleteStart,
  QuerySuggestion,
  QuerySuggestionBasic,
  QuerySuggestionField,
  QuerySuggestionGetFn,
  QuerySuggestionGetFnArgs,
} from './autocomplete';
export * from './deprecated';
export { IndexPattern, IndexPatternField, IndexPatternsContract, TypeMeta } from './index_patterns';
/*
 * Index patterns:
 */
export type { IndexPatternsService } from './index_patterns';
export {
  connectToQueryState,
  createSavedQueryService,
  extractTimeRange,
  FilterManager,
  generateFilters,
  getDefaultQuery,
  getDisplayValueFromFilter,
  syncQueryStateWithUrl,
  TimeHistory,
} from './query';
export type {
  AutoRefreshDoneFn,
  QueryStart,
  QueryState,
  QueryStateChange,
  SavedQuery,
  SavedQueryService,
  SavedQueryTimeFilter,
  TimefilterContract,
  TimeHistoryContract,
} from './query';
export {
  extractSearchSourceReferences,
  getSearchParamsFromRequest,
  injectSearchSourceReferences,
  isEsError,
  noSearchSessionStorageCapabilityMessage,
  parseSearchSourceJSON,
  SearchSessionState,
  SEARCH_SESSIONS_MANAGEMENT_ID,
  SortDirection,
  waitUntilNextSessionCompletes$,
} from './search';
export type {
  EsQuerySortValue,
  // search
  ES_SEARCH_STRATEGY,
  // errors
  IEsError,
  IEsSearchRequest,
  IEsSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchGeneric,
  ISearchSetup,
  ISearchSource,
  ISearchStart,
  ISearchStartSearchSource,
  ISessionsClient,
  // TODO: remove these when data_enhanced is merged into data
  ISessionService,
  Reason,
  SearchRequest,
  SearchSessionInfoProvider,
  SearchSource,
  SearchSourceFields,
  SearchUsageCollector,
  WaitUntilNextSessionCompletesOptions,
} from './search';
export type { AggsStart } from './search/aggs';
export { APPLY_FILTER_TRIGGER } from './triggers';
export type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  DataPublicPluginStartActions,
  DataPublicPluginStartUi,
  IDataPluginServices,
} from './types';
export { FilterItem, FilterLabel, QueryStringInput, SearchBar } from './ui';
/*
 * UI components
 */
export type {
  IndexPatternSelectProps,
  QueryStringInputProps,
  SearchBarProps,
  StatefulSearchBarProps,
} from './ui';
// Export plugin after all other imports
export type { DataPublicPlugin as DataPlugin };

export const exporters = {
  datatableToCSV,
  CSV_MIME_TYPE,
  cellHasFormulas,
  tableHasFormulas,
};

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
};

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
 * Plugin setup
 */

export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new DataPublicPlugin(initializerContext);
}
