import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
/** Only exported for tests */
export declare const MISSING_CONFIG_STORAGE_KEY = "core.warnings.publicBaseUrlMissingDismissed";
interface Deps {
    docLinks: DocLinksStart;
    http: InternalHttpStart;
    notifications: NotificationsStart;
    storage?: Storage;
    location?: Location;
    analytics: AnalyticsServiceStart;
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
}
export declare const setupPublicBaseUrlConfigWarning: ({ docLinks, http, notifications, storage, location, ...renderContextDeps }: Deps) => void;
export {};
