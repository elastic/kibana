import type { estypes } from '@elastic/elasticsearch';
import type { AnalyticsServiceStart, NotificationsStart, ThemeServiceStart, UserProfileService } from '@kbn/core/public';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { Start as InspectorStart, RequestAdapter } from '@kbn/inspector-plugin/public';
import type { WarningHandlerCallback } from './types';
interface Services {
    analytics: AnalyticsServiceStart;
    i18n: I18nStart;
    inspector: InspectorStart;
    notifications: NotificationsStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
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
