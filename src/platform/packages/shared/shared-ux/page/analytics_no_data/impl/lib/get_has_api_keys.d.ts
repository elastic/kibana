import type { AnalyticsNoDataPageServices } from '@kbn/shared-ux-page-analytics-no-data-types';
import type { Observable } from 'rxjs';
export interface HasApiKeysEndpointResponseData {
    hasApiKeys: boolean;
}
export interface HasApiKeysResponse {
    hasApiKeys: boolean | null;
    isLoading: boolean;
    error: Error | null;
}
export declare const getHasApiKeys$: ({ get, }: {
    get: AnalyticsNoDataPageServices["getHttp"];
}) => Observable<HasApiKeysResponse>;
