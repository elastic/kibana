import type { KibanaErrorService } from './src/services/error_service';
/**
 * Services that are consumed internally in this component.
 * @internal
 */
export interface KibanaErrorBoundaryServices {
    onClickRefresh: () => void;
    errorService: KibanaErrorService;
}
/**
 * {analytics: AnalyticsServiceStart | undefined}
 * @public
 */
export interface KibanaErrorBoundaryProviderDeps {
    analytics: {
        reportEvent: (eventType: string, eventData: object) => void;
    } | undefined;
}
