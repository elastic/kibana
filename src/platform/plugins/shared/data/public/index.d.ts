import type { PluginInitializerContext } from '@kbn/core/public';
import type { ConfigSchema } from '../server/config';
export { getEsQueryConfig } from '../common';
export { getDisplayValueFromFilter, getFieldDisplayValueFromFilter, generateFilters, getIndexPatternFromFilter, } from './query';
export { convertIntervalToEsInterval } from '../common/search/aggs/buckets/lib/time_buckets/calc_es_interval';
/**
 * Exporters (CSV)
 */
import { datatableToCSV } from '../common';
export declare const exporters: {
    datatableToCSV: typeof datatableToCSV;
    CSV_MIME_TYPE: string;
    cellHasFormulas: (val: string) => boolean;
    tableHasFormulas: (columns: import("../../expressions/common").Datatable["columns"], rows: import("../../expressions/common").Datatable["rows"]) => boolean;
};
export type { AggregationRestrictions as IndexPatternAggRestrictions, IndexPatternLoadExpressionFunctionDefinition, GetFieldsOptions, AggregationRestrictions, DataViewListItem, } from '../common';
export { ES_FIELD_TYPES, KBN_FIELD_TYPES, UI_SETTINGS, fieldList, DuplicateDataViewError, } from '../common';
import { CidrMask, isDateHistogramBucketAggConfig, propFilter, dateHistogramInterval, InvalidEsCalendarIntervalError, InvalidEsIntervalFormatError, IpAddress, isValidEsInterval, isValidInterval, parseEsInterval, parseInterval, toAbsoluteDates, getResponseInspectorStats, calcAutoIntervalLessThan, tabifyAggResponse, tabifyGetColumns } from '../common';
export { AggGroupLabels, AggGroupNames, METRIC_TYPES, BUCKET_TYPES } from '../common';
export type { AggConfigSerialized, AggGroupName, AggFunctionsMapping, AggParam, AggParamOption, AggParamType, AggConfigOptions, EsaggsExpressionFunctionDefinition, IAggConfig, IAggConfigs, IAggType, IFieldParamType, IMetricAggType, OptionedParamType, OptionedValueProp, ParsedInterval, ExpressionFunctionKql, ExpressionFunctionLucene, ExpressionFunctionKibana, ExpressionFunctionKibanaContext, ExpressionValueSearchContext, KibanaContext, } from '../common';
export type { AggConfigs, AggConfig } from '../common';
export type { ES_SEARCH_STRATEGY, EsQuerySortValue, ISearchSetup, ISearchStart, ISearchStartSearchSource, ISearchSource, SearchRequest, SearchSourceFields, SerializedSearchSourceFields, WaitUntilNextSessionCompletesOptions, } from './search';
export { parseSearchSourceJSON, injectSearchSourceReferences, extractSearchSourceReferences, getSearchParamsFromRequest, noSearchSessionStorageCapabilityMessage, SEARCH_SESSIONS_MANAGEMENT_ID, waitUntilNextSessionCompletes$, SearchSource, SearchSessionState, SortDirection, } from './search';
export type { ISessionService, SearchSessionInfoProvider, ISessionsClient, SearchUsageCollector, } from './search';
export { isRunningResponse } from '../common';
export declare const search: {
    aggs: {
        CidrMask: typeof CidrMask;
        dateHistogramInterval: typeof dateHistogramInterval;
        intervalOptions: ({
            display: string;
            val: string;
            enabled(agg: import("../common").IBucketAggConfig): boolean;
        } | {
            display: string;
            val: string;
            enabled?: undefined;
        })[];
        InvalidEsCalendarIntervalError: typeof InvalidEsCalendarIntervalError;
        InvalidEsIntervalFormatError: typeof InvalidEsIntervalFormatError;
        IpAddress: typeof IpAddress;
        isDateHistogramBucketAggConfig: typeof isDateHistogramBucketAggConfig;
        isNumberType: (agg: import("../common").IAggConfig) => boolean;
        isStringType: (agg: import("../common").IAggConfig) => boolean;
        isType: (...types: string[]) => (agg: import("../common").IAggConfig) => boolean;
        isValidEsInterval: typeof isValidEsInterval;
        isValidInterval: typeof isValidInterval;
        parentPipelineType: string;
        parseEsInterval: typeof parseEsInterval;
        parseInterval: typeof parseInterval;
        propFilter: typeof propFilter;
        siblingPipelineType: string;
        termsAggFilter: string[];
        toAbsoluteDates: typeof toAbsoluteDates;
        boundsDescendingRaw: ({
            bound: number;
            interval: import("moment").Duration;
            boundLabel: string;
            intervalLabel: string;
        } | {
            bound: import("moment").Duration;
            interval: import("moment").Duration;
            boundLabel: string;
            intervalLabel: string;
        })[];
        calcAutoIntervalLessThan: typeof calcAutoIntervalLessThan;
    };
    getResponseInspectorStats: typeof getResponseInspectorStats;
    tabifyAggResponse: typeof tabifyAggResponse;
    tabifyGetColumns: typeof tabifyGetColumns;
};
/**
 * Types to be shared externally
 * @public
 */
export type { RefreshInterval } from '../common';
export { createSavedQueryService, connectToQueryState, syncQueryStateWithUrl, syncGlobalQueryStateWithUrl, getDefaultQuery, FilterManager, TimeHistory, getQueryLog, mapAndFlattenFilters, QueryService, } from './query';
export { NowProvider } from './now_provider';
export type { NowProviderInternalContract, NowProviderPublicContract } from './now_provider';
export type { QueryState, QueryState$, SavedQuery, SavedQueryService, SavedQueryTimeFilter, TimefilterContract, TimeHistoryContract, QueryStateChange, QueryStart, AutoRefreshDoneFn, PersistedLog, QueryStringContract, QuerySetup, TimefilterSetup, GlobalQueryStateFromUrl, TimefilterHook, } from './query';
export type { AggsStart } from './search/aggs';
export { getTime } from '../common';
export type { SavedObject } from '../common';
export { isTimeRange, isQuery, flattenHit, calculateBounds, tabifyAggResponse } from '../common';
import { DataPublicPlugin } from './plugin';
export declare function plugin(initializerContext: PluginInitializerContext<ConfigSchema>): DataPublicPlugin;
export type { DataPublicPluginSetup, DataPublicPluginStart, DataPublicPluginStartActions, } from './types';
export type { DataPublicPlugin as DataPlugin };
