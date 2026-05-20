import type { CoreStart, HttpStart, OverlayStart } from '@kbn/core/public';
import type { TelemetryService } from '../telemetry_service';
import type { TelemetryConstants } from '../..';
type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme' | 'userProfile'>;
interface TelemetryNotificationsConstructor extends StartServices {
    http: HttpStart;
    overlays: OverlayStart;
    telemetryService: TelemetryService;
    telemetryConstants: TelemetryConstants;
}
/**
 * Helpers to the Telemetry banners spread through the code base in Welcome and Home landing pages.
 */
export declare class TelemetryNotifications {
    private readonly http;
    private readonly overlays;
    private readonly startServices;
    private readonly telemetryConstants;
    private readonly telemetryService;
    private optInStatusNoticeBannerId?;
    constructor({ http, overlays, telemetryService, telemetryConstants, ...startServices }: TelemetryNotificationsConstructor);
    /**
     * Should the opted-in banner be shown to the user?
     */
    shouldShowOptInStatusNoticeBanner: () => boolean;
    /**
     * Renders the banner that claims the cluster is opted-in, and gives the option to opt-out.
     */
    renderOptInStatusNoticeBanner: () => void;
    /**
     * Clears the banner and stores the user's dismissal of the banner.
     */
    setOptInStatusNoticeSeen: () => Promise<void>;
}
export {};
