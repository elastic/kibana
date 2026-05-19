import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlayFlyoutStart } from '@kbn/core-overlays-browser';
interface StartDeps {
    analytics: AnalyticsServiceStart;
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
    targetDomElement: Element;
}
/** @internal */
export declare class FlyoutService {
    private activeFlyout;
    private targetDomElement;
    start({ analytics, i18n, theme, userProfile, targetDomElement, }: StartDeps): OverlayFlyoutStart;
    closeAllFlyouts(): void;
    /**
     * Using React.Render to re-render into a target DOM element will replace
     * the content of the target but won't call unmountComponent on any
     * components inside the target or any of their children. So we properly
     * cleanup the DOM here to prevent subtle bugs in child components which
     * depend on unmounting for cleanup behaviour.
     */
    private cleanupDom;
}
export {};
