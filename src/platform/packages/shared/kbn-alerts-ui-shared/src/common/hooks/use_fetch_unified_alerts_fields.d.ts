import type { ToastsStart } from '@kbn/core/public';
import type { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';
import type { FetchUnifiedAlertsFieldsParams } from '../apis/fetch_unified_alert_fields';
import { fetchUnifiedAlertsFields } from '../apis/fetch_unified_alert_fields/fetch_unified_alerts_fields';
export type UseFetchUnifiedAlertsFieldsQueryParams = FetchUnifiedAlertsFieldsParams & {
    toasts: ToastsStart;
};
/**
 * Fetch fields for the given rule type ids
 */
export declare const useFetchUnifiedAlertsFields: ({ http, ...params }: UseFetchUnifiedAlertsFieldsQueryParams, options?: Pick<QueryOptionsOverrides<typeof fetchUnifiedAlertsFields>, "placeholderData" | "context" | "onError" | "refetchOnWindowFocus" | "staleTime" | "enabled">) => import("@kbn/react-query").UseQueryResult<import("@kbn/alerting-types").GetAlertFieldsResponse, unknown>;
