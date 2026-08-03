import type { Observable } from 'rxjs';
import type { ConnectionRequestParams } from '@elastic/transport';
import type { Logger, SharedGlobalConfig } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { ISearchStrategy } from '../../types';
import type { SearchUsage } from '../../collectors/search';
/**
 * Get the Kibana representation of this response (see `IKibanaSearchResponse`).
 * @internal
 */
export declare function toKibanaSearchResponse(rawResponse: estypes.SearchResponse<unknown>, requestParams?: ConnectionRequestParams): {
    total: number;
    loaded: number;
    requestParams?: import("@kbn/search-types").SanitizedConnectionRequestParams | undefined;
    rawResponse: estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>;
    isPartial: boolean;
    isRunning: boolean;
};
export declare const esSearchStrategyProvider: (config$: Observable<SharedGlobalConfig>, logger: Logger, usage?: SearchUsage) => ISearchStrategy;
