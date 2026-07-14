import type { UserProfileData, UserProfileLabels, UserProfileWithSecurity } from '@kbn/core-user-profile-common';
export interface UserProfileRequestHandlerContext {
    getCurrent<D extends UserProfileData, L extends UserProfileLabels>(options?: {
        dataPath?: string;
    }): Promise<UserProfileWithSecurity<D, L> | null>;
}
