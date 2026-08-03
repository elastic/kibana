import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config';
import type { DataServerPlugin, DataPluginSetup, DataPluginStart } from './plugin';
export { getEsQueryConfig, DEFAULT_QUERY_LANGUAGE } from '../common';
export { getRequestAbortedSignal } from './lib';
/**
 * Exporters (CSV)
 */
import { datatableToCSV } from '../common';
export declare const exporters: {
    datatableToCSV: typeof datatableToCSV;
    CSV_MIME_TYPE: string;
};
export { ES_FIELD_TYPES, KBN_FIELD_TYPES, UI_SETTINGS, DataViewsService as DataViewsCommonService, DataView, } from '../common';
/**
 * Search
 */
import { CidrMask, dateHistogramInterval, IpAddress, parseInterval, calcAutoIntervalLessThan } from '../common';
export type { ParsedInterval } from '../common';
export { METRIC_TYPES, ES_SEARCH_STRATEGY } from '../common';
export type { IScopedSearchClient, ISearchStrategy, SearchStrategyDependencies, ISearchSessionService, SearchRequestHandlerContext, DataRequestHandlerContext, } from './search';
export { SearchSessionService, NoSearchIdInSessionError, INITIAL_SEARCH_SESSION_REST_VERSION, INTERNAL_ENHANCED_ES_SEARCH_STRATEGY, } from './search';
export { shimHitsTotal } from '../common/search';
export declare const search: {
    aggs: {
        CidrMask: typeof CidrMask;
        dateHistogramInterval: typeof dateHistogramInterval;
        IpAddress: typeof IpAddress;
        parseInterval: typeof parseInterval;
        calcAutoIntervalLessThan: typeof calcAutoIntervalLessThan;
    };
};
/**
 * Types to be shared externally
 * @public
 */
export { getTime, parseInterval } from '../common';
/**
 * Static code to be shared externally
 * @public
 */
export declare function plugin(initializerContext: PluginInitializerContext<ConfigSchema>): Promise<DataServerPlugin>;
export type { DataPluginSetup as PluginSetup, DataPluginStart as PluginStart };
export type { DataServerPlugin as Plugin };
export declare const config: PluginConfigDescriptor<ConfigSchema>;
