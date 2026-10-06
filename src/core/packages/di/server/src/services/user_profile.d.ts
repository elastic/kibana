import type { ServiceToken } from '@kbn/core-di';
import type { UserProfileGetCurrentParams } from '@kbn/core-user-profile-server';
import type { UserProfileData, UserProfileLabels, UserProfileWithSecurity } from '@kbn/core-user-profile-common';
/**
 * Retrieves the user profile of the user of the current HTTP request or `null` if the profile is not available.
 * @see {@link UserProfileWithSecurity}
 * @public
 */
export type IUserProfileFactory = <D extends UserProfileData, L extends UserProfileLabels>(options?: Pick<UserProfileGetCurrentParams, 'dataPath'>) => Promise<UserProfileWithSecurity<D, L> | null>;
/**
 * The factory retrieving the user profile in the current HTTP request context.
 * @public
 */
export declare const UserProfileFactory: ServiceToken<IUserProfileFactory>;
/**
 * The user profile identifier of the user of the current HTTP request or `null` if the profile is not available.
 * @public
 */
export declare const CurrentUserProfileId: ServiceToken<string | null>;
