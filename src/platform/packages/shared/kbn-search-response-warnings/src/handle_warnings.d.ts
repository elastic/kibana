import type { estypes } from '@elastic/elasticsearch';
import type { NotificationsStart } from '@kbn/core/public';
import type { Start as InspectorStart, RequestAdapter } from '@kbn/inspector-plugin/public';
import type { WarningHandlerCallback } from './types';
interface Services {
    inspector: InspectorStart;
    notifications: NotificationsStart;
}
/**
 * @internal
 * All warnings are expected to come from the same response.
 */
export declare function handleWarnings({ callback, request, requestId, requestName, requestAdapter, response, services, }: {
    callback?: WarningHandlerCallback;
    request: estypes.SearchRequest;
    requestAdapter: RequestAdapter;
    requestId?: string;
    requestName: string;
    response: estypes.SearchResponse;
    services: Services;
}): void;
export {};
