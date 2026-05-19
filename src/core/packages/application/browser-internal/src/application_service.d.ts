import type { History } from 'history';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { InternalHttpSetup, InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import type { InternalApplicationSetup, InternalApplicationStart } from './types';
export interface SetupDeps {
    http: InternalHttpSetup;
    analytics: AnalyticsServiceSetup;
    history?: History<any>;
    /** Used to redirect to external urls */
    redirectTo?: (path: string) => void;
}
export interface StartDeps {
    http: InternalHttpStart;
    analytics: AnalyticsServiceStart;
    theme: ThemeServiceStart;
    overlays: OverlayStart;
    customBranding: CustomBrandingStart;
}
/**
 * Service that is responsible for registering new applications.
 * @internal
 */
export declare class ApplicationService {
    private readonly apps;
    private readonly mounters;
    private readonly capabilities;
    private readonly appInternalStates;
    private currentAppId$;
    private currentActionMenu$;
    private readonly statusUpdaters$;
    private readonly subscriptions;
    private stop$;
    private registrationClosed;
    private history?;
    private location$?;
    private navigate?;
    private openInNewTab?;
    private redirectTo?;
    private overlayStart$;
    private hasCustomBranding$;
    setup({ http: { basePath }, analytics, redirectTo, history, }: SetupDeps): InternalApplicationSetup;
    start({ analytics, http, overlays, theme, customBranding, }: StartDeps): Promise<InternalApplicationStart>;
    private setAppLeaveHandler;
    private setAppActionMenu;
    private refreshCurrentActionMenu;
    private shouldNavigate;
    private onBeforeUnload;
    stop(): void;
}
