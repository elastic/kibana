import type { estypes } from '@elastic/elasticsearch';
import type { ISearchOptions } from '@kbn/search-types';
/**
 * Get the `total`/`loaded` for this response (see `IKibanaSearchResponse`). Note that `skipped` is
 * not included as it is already included in `successful`.
 * @internal
 */
export declare function getTotalLoaded(response: estypes.SearchResponse<unknown>): {
    total: number;
    loaded: number;
};
/**
 * Temporary workaround until https://github.com/elastic/kibana/issues/26356 is addressed.
 * Since we are setting `track_total_hits` in the request, `hits.total` will be an object
 * containing the `value`.
 *
 * @internal
 */
export declare function shimHitsTotal(response: estypes.SearchResponse<unknown>, { legacyHitsTotal }?: ISearchOptions): estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>> | {
    hits: {
        total: any;
        hits: estypes.SearchHit<unknown>[];
        max_score?: estypes.double | null;
    };
    took: estypes.long;
    timed_out: boolean;
    _shards: estypes.ShardStatistics;
    aggregations?: Record<string, estypes.AggregationsAggregate> | undefined;
    _clusters?: estypes.ClusterStatistics;
    fields?: Record<string, any>;
    max_score?: estypes.double;
    num_reduce_phases?: estypes.long;
    profile?: estypes.SearchProfile;
    pit_id?: estypes.Id;
    _scroll_id?: estypes.ScrollId;
    suggest?: Record<string, estypes.SearchSuggest<unknown>[]> | undefined;
    terminated_early?: boolean;
};
