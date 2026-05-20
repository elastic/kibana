export declare const userProfileKeys: {
    get: (uid: string) => string[];
    bulkGet: (uids: string[]) => (string | {
        uids: string[];
    })[];
    suggest: (name: string) => string[];
};
export declare const useUserProfile: (uid: string) => import("@kbn/react-query").UseQueryResult<import("@kbn/user-profile-components").UserProfile<import("@kbn/user-profile-components").UserProfileData>, unknown>;
export declare const useUserProfiles: (uids: string[], opts?: {
    enabled?: boolean;
}) => import("@kbn/react-query").UseQueryResult<import("@kbn/user-profile-components").UserProfile<import("@kbn/user-profile-components").UserProfileData>[], unknown>;
/**
 * React Query hook for searching user profiles by name, email, or username.
 *
 * Uses a 30s `staleTime` since suggest results are transient queries.
 * Disabled when `suggestUserProfiles` is not provided (graceful degradation)
 * or when `name` is empty. The caller is responsible for debouncing the `name` input.
 */
export declare const useSuggestUserProfiles: (name: string, opts?: {
    enabled?: boolean;
}) => import("@kbn/react-query").UseQueryResult<import("@kbn/user-profile-components").UserProfile<import("@kbn/user-profile-components").UserProfileData>[], unknown>;
