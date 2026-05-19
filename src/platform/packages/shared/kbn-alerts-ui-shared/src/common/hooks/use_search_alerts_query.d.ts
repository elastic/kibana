import type { SetOptional } from 'type-fest';
import { type SearchAlertsParams } from '../apis/search_alerts/search_alerts';
export type UseSearchAlertsQueryParams = SetOptional<Omit<SearchAlertsParams, 'signal'>, 'query' | 'sort' | 'pageIndex' | 'pageSize'>;
export declare const queryKeyPrefix: string[];
/**
 * Query alerts
 *
 * When testing components that depend on this hook, prefer mocking the {@link searchAlerts} function instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export declare const useSearchAlertsQuery: ({ data, skipAlertsQueryContext, ...params }: UseSearchAlertsQueryParams) => import("@kbn/react-query").UseQueryResult<import("../apis/search_alerts/search_alerts").SearchAlertsResult, unknown>;
