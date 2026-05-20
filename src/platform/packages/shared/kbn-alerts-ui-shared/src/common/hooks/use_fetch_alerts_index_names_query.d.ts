import type { FetchAlertsIndexNamesParams } from '../apis/fetch_alerts_index_names';
import { fetchAlertsIndexNames } from '../apis/fetch_alerts_index_names';
import type { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';
export type UseFetchAlertsIndexNamesQueryParams = FetchAlertsIndexNamesParams;
export declare const queryKeyPrefix: string[];
/**
 * Fetch alerts index names feature ids
 *
 * When testing components that depend on this hook, prefer mocking the {@link fetchAlertsIndexNames} function instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export declare const useFetchAlertsIndexNamesQuery: ({ http, ruleTypeIds }: UseFetchAlertsIndexNamesQueryParams, options?: Pick<QueryOptionsOverrides<typeof fetchAlertsIndexNames>, "context" | "enabled" | "onError" | "refetchOnWindowFocus" | "retry" | "staleTime">) => import("@kbn/react-query").UseQueryResult<string[], unknown>;
