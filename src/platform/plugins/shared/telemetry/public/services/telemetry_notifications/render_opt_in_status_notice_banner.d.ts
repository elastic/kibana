import type { CoreStart, HttpStart, OverlayStart } from '@kbn/core/public';
import type { TelemetryService } from '..';
import type { TelemetryConstants } from '../..';
interface RenderBannerConfig extends Pick<CoreStart, 'analytics' | 'i18n' | 'theme' | 'userProfile'> {
    http: HttpStart;
    overlays: OverlayStart;
    onSeen: () => void;
    telemetryConstants: TelemetryConstants;
    telemetryService: TelemetryService;
}
export declare function renderOptInStatusNoticeBanner({ onSeen, overlays, http, telemetryConstants, telemetryService, ...startServices }: RenderBannerConfig): string;
export {};
