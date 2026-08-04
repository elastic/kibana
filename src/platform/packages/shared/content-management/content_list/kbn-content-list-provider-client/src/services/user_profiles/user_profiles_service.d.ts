import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { ContentListUserProfilesServices } from '@kbn/content-list-provider';
/**
 * Build a {@link ContentListUserProfilesServices} for
 * `ContentListClientProvider`'s `services.userProfiles` slot from the core
 * user-profile service.
 *
 * The factory wraps `userProfile.bulkGet({ uids, dataPath: 'avatar' })` and
 * shapes each profile into the `UserProfileEntry` form used by the provider's
 * `ProfileCache` (`{ uid, user, avatar, email, fullName }`).
 *
 * `email` is coalesced to `''` and `fullName` falls back to the username when
 * unset, matching the convention used by the legacy `TableListView` user
 * profile filter.
 *
 * Calls with an empty `uids` array short-circuit and return `[]` without
 * issuing a request.
 *
 * @example
 * ```ts
 * const userProfiles = createUserProfilesService(coreServices.userProfile);
 * ```
 */
export declare const createUserProfilesService: (userProfile: UserProfileServiceStart) => ContentListUserProfilesServices;
