import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { InternalHttpSetup, InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
import type { InternalApplicationSetup, InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
export interface CoreAppsServiceSetupDeps {
    application: InternalApplicationSetup;
    http: InternalHttpSetup;
    injectedMetadata: InternalInjectedMetadataSetup;
    notifications: NotificationsSetup;
}
export interface CoreAppsServiceStartDeps {
    application: InternalApplicationStart;
    docLinks: DocLinksStart;
    http: InternalHttpStart;
    notifications: NotificationsStart;
    uiSettings: IUiSettingsClient;
    analytics: AnalyticsServiceStart;
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
}
export declare class CoreAppsService {
    private readonly coreContext;
    private docLinks?;
    constructor(coreContext: CoreContext);
    setup({ application, http, injectedMetadata, notifications }: CoreAppsServiceSetupDeps): void;
    start({ application, docLinks, http, notifications, uiSettings, ...startDeps }: CoreAppsServiceStartDeps): void;
    stop(): void;
}
