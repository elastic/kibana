import type { UserProfileData } from '@kbn/core-user-profile-common';
import type { UserProfileService } from './service';
export type CoreUserProfileDelegateContract = UserProfileService & {
    /**
     * Updates user preferences by identifier.
     * @param uid User ID
     * @param data Application data to be written (merged with existing data).
     */
    update<D extends UserProfileData>(uid: string, data: D): Promise<void>;
};
