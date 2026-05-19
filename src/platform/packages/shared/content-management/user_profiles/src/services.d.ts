import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { FC, PropsWithChildren } from 'react';
import type { UserProfile } from '@kbn/user-profile-components';
export interface UserProfilesKibanaDependencies {
    core: {
        userProfile: {
            bulkGet: UserProfileServiceStart['bulkGet'];
            suggest?: UserProfileServiceStart['suggest'];
        };
    };
    /**
     * Path to the consumer's suggest endpoint (e.g. `/internal/content_management/_suggest_user_profiles`).
     * Required alongside `core.userProfile.suggest` for the suggest feature to work.
     */
    suggestPath?: string;
}
export interface UserProfilesServices {
    bulkGetUserProfiles: (uids: string[]) => Promise<UserProfile[]>;
    getUserProfile: (uid: string) => Promise<UserProfile>;
    suggestUserProfiles?: (name: string) => Promise<UserProfile[]>;
}
export declare const UserProfilesProvider: FC<PropsWithChildren<UserProfilesServices>>;
export declare const UserProfilesKibanaProvider: FC<PropsWithChildren<UserProfilesKibanaDependencies>>;
export declare function useUserProfilesServices(): UserProfilesServices;
