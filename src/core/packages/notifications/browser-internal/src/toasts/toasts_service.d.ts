import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { NotificationCoordinator } from '@kbn/core-notifications-browser';
import { ToastsApi } from './toasts_api';
interface SetupDeps {
    analytics: AnalyticsServiceSetup;
    uiSettings: IUiSettingsClient;
}
interface StartDeps {
    overlays: OverlayStart;
    rendering: RenderingService;
    analytics: AnalyticsServiceStart;
    targetDomElement: HTMLElement;
    notificationCoordinator: NotificationCoordinator;
}
export declare class ToastsService {
    private api?;
    private targetDomElement?;
    private readonly telemetry;
    setup({ uiSettings, analytics }: SetupDeps): ToastsApi;
    start({ overlays, targetDomElement, rendering, analytics, notificationCoordinator, }: StartDeps): ToastsApi;
    stop(): void;
}
export {};
