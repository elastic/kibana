import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
interface StartDeps {
    targetDomElement: HTMLElement;
    analytics: AnalyticsServiceStart;
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
    uiSettings: IUiSettingsClient;
}
/** @internal */
export declare class OverlayService {
    private bannersService;
    private modalService;
    private flyoutService;
    private systemFlyoutService;
    closeAllFlyouts(): void;
    start({ targetDomElement, ...startDeps }: StartDeps): OverlayStart;
}
export {};
