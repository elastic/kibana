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
export interface InternalUserSettingsServiceSetup {
    getUserSettingDarkMode: (request: KibanaRequest) => Promise<DarkModeValue | undefined>;
    getUserSettingLocale: (request: KibanaRequest) => Promise<string | undefined>;
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
