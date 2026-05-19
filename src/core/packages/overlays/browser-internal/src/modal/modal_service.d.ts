import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlayModalStart } from '@kbn/core-overlays-browser';
interface StartDeps {
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
    analytics: AnalyticsServiceStart;
    targetDomElement: Element;
}
/** @internal */
export declare class ModalService {
    private activeModal;
    private targetDomElement;
    start({ targetDomElement, ...startDeps }: StartDeps): OverlayModalStart;
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
