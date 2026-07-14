import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlaySystemFlyoutStart } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
interface SystemFlyoutStartDeps {
    analytics: AnalyticsServiceStart;
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
    targetDomElement: Element;
}
/**
 * Service for managing system flyouts that integrate with the EUI Flyout Manager.
 * Supports non-React contexts while preserving React context and EUI Flyout System features.
 */
export declare class SystemFlyoutService {
    private targetDomElement;
    private activeFlyouts;
    start({ analytics, i18n, theme, userProfile, targetDomElement, }: SystemFlyoutStartDeps): OverlaySystemFlyoutStart;
    /**
     * Cleanup method for when the service is stopped
     */
    closeAllFlyouts(): void;
    stop(): void;
}
export {};
