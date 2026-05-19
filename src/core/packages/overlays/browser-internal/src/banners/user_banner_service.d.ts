import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { OverlayBannersStart } from '@kbn/core-overlays-browser';
interface StartServices {
    analytics: AnalyticsServiceStart;
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
}
interface StartDeps extends StartServices {
    banners: OverlayBannersStart;
    uiSettings: IUiSettingsClient;
}
/**
 * Sets up the custom banner that can be specified in advanced settings.
 * @internal
 */
export declare class UserBannerService {
    private settingsSubscription?;
    start({ banners, uiSettings, ...startServices }: StartDeps): void;
    stop(): void;
}
export {};
