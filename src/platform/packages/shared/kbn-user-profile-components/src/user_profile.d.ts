import type { UserProfileAvatarData, UserProfileData } from './types';
/**
 * IMPORTANT:
 *
 * The types in this file have been imported from
 * `x-pack/platform/plugins/shared/security/common/model/user_profile.ts`
 *
 * When making changes please ensure to keep both files in sync.
 */
/**
 * Describes basic properties stored in user profile.
 */
export interface UserProfile<D extends UserProfileData = UserProfileData> {
    /**
     * Unique ID for of the user profile.
     */
    uid: string;
    /**
     * Indicates whether user profile is enabled or not.
     */
    enabled: boolean;
    /**
     * Information about the user that owns profile.
     */
    user: UserProfileUserInfo;
    /**
     * User specific data associated with the profile.
     */
    data: Partial<D>;
}
/**
 * Basic user information returned in user profile.
 */
export interface UserProfileUserInfo {
    /**
     * Username of the user.
     */
    username: string;
    /**
     * Optional email of the user.
     */
    email?: string;
    /**
     * Optional full name of the user.
     */
    full_name?: string;
}
export declare const USER_AVATAR_FALLBACK_CODE_POINT = 97;
export declare const USER_AVATAR_MAX_INITIALS = 2;
/**
 * Validates if the provided color string is a valid hex color.
 * @param color - The color to validate.
 * @returns True if the color is a valid hex color, false otherwise.
 */
export declare function isValidUserProfileAvatarColor(color?: string): boolean;
/**
 * Determines the color for the provided user profile.
 * If a color is present on the user profile itself, then that is used.
 * Otherwise, a color is provided from EUI's Visualization Colors based on the display name.
 *
 * @param {UserProfileUserInfo} user User info
 * @param {UserProfileAvatarData} avatar User avatar
 */
export declare function getUserAvatarColor(user: Pick<UserProfileUserInfo, 'username' | 'full_name'>, avatar?: UserProfileAvatarData): string | undefined;
/**
 * Determines the initials for the provided user profile.
 * If initials are present on the user profile itself, then that is used.
 * Otherwise, the initials are calculated based off the words in the display name, with a max length of 2 characters.
 *
 * @param {UserProfileUserInfo} user User info
 * @param {UserProfileAvatarData} avatar User avatar
 */
export declare function getUserAvatarInitials(user: Pick<UserProfileUserInfo, 'username' | 'full_name'>, avatar?: UserProfileAvatarData): string;
/**
 * Set of available name-related fields to pick as display name.
 */
export interface GetUserDisplayNameParams {
    /**
     * Username of the user.
     */
    username: string;
    /**
     * Optional email of the user.
     */
    email?: string;
    /**
     * Optional full name of the user.
     */
    full_name?: string;
}
/**
 * Determines the display name for the provided user information.
 * @param params Set of available user's name-related fields.
 */
export declare function getUserDisplayName(params: GetUserDisplayNameParams): string;
/**
 * Determines the display label for the provided user information.
 * Includes the email if it is different from the display name.
 * @param params Set of available user's name-related fields.
 */
export declare function getUserDisplayLabel(user: GetUserDisplayNameParams): string;
