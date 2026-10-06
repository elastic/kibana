import type { CoreContext } from '@kbn/core-base-server-internal';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { DarkModeValue } from '@kbn/core-ui-settings-common';
import type { InternalUserProfileServiceStart } from '@kbn/core-user-profile-server-internal';
export interface UserSettingsServiceStartDeps {
    userProfile: InternalUserProfileServiceStart;
}
/**
 * @internal
 */
export interface UserSettings {
    darkMode: DarkModeValue | undefined;
    locale: string | undefined;
    rememberSelectedSpace: boolean;
}
/**
 * @internal
 */
export interface InternalUserSettingsServiceSetup {
    getUserSettings: (request: KibanaRequest) => Promise<UserSettings>;
    getUserSettingDarkMode: (request: KibanaRequest) => Promise<DarkModeValue | undefined>;
}
/**
 * @internal
 */
export declare class UserSettingsService {
    private logger;
    private userProfile?;
    constructor(coreContext: CoreContext);
    setup(): InternalUserSettingsServiceSetup;
    start(deps: UserSettingsServiceStartDeps): void;
    private getSettings;
}
