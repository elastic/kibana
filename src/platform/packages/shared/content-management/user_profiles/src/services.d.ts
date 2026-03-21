import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { FC, PropsWithChildren } from 'react';
import type { UserProfile } from '@kbn/user-profile-components';
export interface UserProfilesKibanaDependencies {
    core: {
        userProfile: {
            bulkGet: UserProfileServiceStart['bulkGet'];
        };
    };
}
export interface UserProfilesServices {
    bulkGetUserProfiles: (uids: string[]) => Promise<UserProfile[]>;
    getUserProfile: (uid: string) => Promise<UserProfile>;
}
export declare const UserProfilesProvider: FC<PropsWithChildren<UserProfilesServices>>;
export declare const UserProfilesKibanaProvider: FC<PropsWithChildren<UserProfilesKibanaDependencies>>;
export declare function useUserProfilesServices(): UserProfilesServices;
