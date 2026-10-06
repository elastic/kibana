import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { type Observable } from 'rxjs';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { Logger } from '@kbn/logging';
export declare function handleSystemColorModeChange({ getNotifications, uiSettings, coreStart, stop$, http, logger, }: {
    getNotifications: () => Promise<NotificationsStart>;
    http: InternalHttpStart;
    uiSettings: IUiSettingsClient;
    coreStart: {
        i18n: I18nStart;
        theme: ThemeServiceStart;
        userProfile: UserProfileService;
    };
    stop$: Observable<void>;
    logger: Logger;
}): void;
