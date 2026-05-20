import { type GetProfilesOptions } from '../profiles_manager';
/**
 * Hook to retreive the resolved profiles
 * @param options Profiles options
 * @returns The resolved profiles
 */
export declare const useProfiles: ({ record }?: GetProfilesOptions) => import("../composable_profile").AppliedProfile[];
