import type { GetProfilesOptions } from '../profiles_manager';
import type { Profile } from '../types';
/**
 * Hook to retrieve an extension point accessor based on the resolved profiles
 * @param key The key of the extension point
 * @param options Options to get the resolved profiles
 * @returns The resolved accessor function
 */
export declare const useProfileAccessor: <TKey extends keyof Profile>(key: TKey, options?: GetProfilesOptions) => (baseImpl: Profile[TKey]) => Profile[TKey];
