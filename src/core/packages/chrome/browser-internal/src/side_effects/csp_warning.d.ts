import type { NotificationsStart } from '@kbn/core-notifications-browser';
export interface CspWarningDeps {
    browserSupportsCsp: boolean;
    warnLegacyBrowsers: boolean;
    getNotifications: () => Promise<NotificationsStart>;
}
/** Shows a warning toast if the browser doesn't support CSP. */
export declare function showCspWarningIfNeeded({ browserSupportsCsp, warnLegacyBrowsers, getNotifications, }: CspWarningDeps): void;
