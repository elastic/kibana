import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalInjectedMetadataStart } from '@kbn/core-injected-metadata-browser-internal';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import type { InternalChromeSetup, InternalChromeStart } from './types';
interface ConstructorParams {
    browserSupportsCsp: boolean;
    kibanaVersion: string;
    basePath: string;
    coreContext: CoreContext;
}
export interface SetupDeps {
    analytics: AnalyticsServiceSetup;
}
export interface StartDeps {
    application: InternalApplicationStart;
    docLinks: DocLinksStart;
    http: InternalHttpStart;
    injectedMetadata: InternalInjectedMetadataStart;
    getNotifications: () => Promise<NotificationsStart>;
    customBranding: CustomBrandingStart;
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
    uiSettings: IUiSettingsClient;
    featureFlags: FeatureFlagsStart;
}
/** @internal */
export declare class ChromeService {
    private readonly params;
    private readonly stop$;
    private readonly navControls;
    private readonly navLinks;
    private readonly recentlyAccessed;
    private readonly docTitle;
    private readonly projectNavigation;
    private readonly sidebar;
    private readonly logger;
    private readonly isServerless;
    constructor(params: ConstructorParams);
    setup({ analytics }: SetupDeps): InternalChromeSetup;
    start({ application, docLinks, http, injectedMetadata, getNotifications, customBranding, i18n, theme, userProfile, uiSettings, featureFlags, }: StartDeps): Promise<InternalChromeStart>;
    stop(): void;
}
export {};
