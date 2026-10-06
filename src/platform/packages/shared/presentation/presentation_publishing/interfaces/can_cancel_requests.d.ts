import type { AbortReason } from '@kbn/kibana-utils-plugin/common';
/**
 * This API can cancel in-flight requests. Calling cancelRequests before the requests are initiated should also prevent them from being started.
 */
export interface CanCancelRequests {
    cancelRequests: (reason?: AbortReason) => void;
}
export declare const apiCanCancelRequests: (api: unknown) => api is CanCancelRequests;
