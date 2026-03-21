export declare const userProfileKeys: {
    get: (uid: string) => string[];
    bulkGet: (uids: string[]) => (string | {
        uids: string[];
    })[];
};
export declare const useUserProfile: (uid: string) => import("@kbn/react-query").UseQueryResult<import("@kbn/user-profile-components").UserProfile<import("@kbn/user-profile-components").UserProfileData>, unknown>;
export declare const useUserProfiles: (uids: string[], opts?: {
    enabled?: boolean;
}) => import("@kbn/react-query").UseQueryResult<import("@kbn/user-profile-components").UserProfile<import("@kbn/user-profile-components").UserProfileData>[], unknown>;
