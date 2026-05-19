import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { IUiSettingsClient, SettingsStart } from '@kbn/core-ui-settings-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { RenderingService } from '@kbn/core-rendering-browser';
export interface SetupDeps {
    analytics: AnalyticsServiceSetup;
    uiSettings: IUiSettingsClient;
}
export interface StartDeps {
    overlays: OverlayStart;
    rendering: RenderingService;
    analytics: AnalyticsServiceStart;
    targetDomElement: HTMLElement;
    settings: SettingsStart;
}
/** @public */
export declare class NotificationsService {
    private readonly toasts;
    private readonly feedback;
    private readonly tours;
    private uiSettingsErrorSubscription?;
    private targetDomElement?;
    private readonly coordinator;
    constructor();
    setup({ uiSettings, analytics }: SetupDeps): NotificationsSetup;
    start({ overlays, targetDomElement, settings, ...startDeps }: StartDeps): NotificationsStart;
    stop(): void;
}
/**
 * @public {@link NotificationsService}
 */
export type NotificationsServiceContract = PublicMethodsOf<NotificationsService>;
