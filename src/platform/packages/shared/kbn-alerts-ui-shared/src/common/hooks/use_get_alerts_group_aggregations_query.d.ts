import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
import type { AggregationsAggregationContainer, QueryDslQueryContainer, SortCombinations } from '@elastic/elasticsearch/lib/api/types';
export interface UseGetAlertsGroupAggregationsQueryProps {
    http: HttpStart;
    toasts: ToastsStart;
    enabled?: boolean;
    params: {
        ruleTypeIds: string[];
        consumers?: string[];
        groupByField: string;
        aggregations?: Record<string, AggregationsAggregationContainer>;
        filters?: QueryDslQueryContainer[];
        sort?: SortCombinations[];
        pageIndex?: number;
        pageSize?: number;
    };
}
/**
 * Fetches alerts aggregations for a given groupByField.
 *
 * Some default aggregations are applied:
 * - `groupByFields`, to get the buckets based on the provided grouping field,
 *   - `unitsCount`, to count the number of alerts in each bucket,
 * - `unitsCount`, to count the total number of alerts targeted by the query,
 * - `groupsCount`, to count the total number of groups.
 *
 * The provided `aggregations` are applied within `groupByFields`. Here the `groupByField` runtime
 * field can be used to perform grouping-based aggregations.
 * `groupByField` buckets computed over a field with a null/absent value are marked with the
 * `isNullGroup` flag set to true and their key is set to the `--` string.
 *
 * Applies alerting RBAC through ruleTypeIds.
 */
export declare const useGetAlertsGroupAggregationsQuery: <T>({ http, toasts, enabled, params, }: UseGetAlertsGroupAggregationsQueryProps) => import("@kbn/react-query").UseQueryResult<SearchResponseBody<{}, T>, Error>;
