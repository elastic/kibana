import type { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';
import type { FetchAlertsFieldsParams } from '../apis/fetch_alerts_fields';
import { fetchAlertsFields } from '../apis/fetch_alerts_fields';
export type UseFetchAlertsFieldsQueryParams = FetchAlertsFieldsParams;
export declare const queryKeyPrefix: string[];
/**
 * Fetch alerts indexes browser fields for the given feature ids
 *
 * When testing components that depend on this hook, prefer mocking the {@link fetchAlertsFields} function instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export declare const useFetchAlertsFieldsQuery: ({ http, ...params }: UseFetchAlertsFieldsQueryParams, options?: Pick<QueryOptionsOverrides<typeof fetchAlertsFields>, "placeholderData" | "context" | "onError" | "refetchOnWindowFocus" | "staleTime" | "enabled">) => import("@kbn/react-query").UseQueryResult<{
    browserFields: import("@kbn/alerting-types").BrowserFields;
    fields: import("@kbn/data-views-plugin/server").FieldDescriptor[];
}, unknown>;
