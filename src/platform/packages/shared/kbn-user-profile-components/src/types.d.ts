import type { Observable } from 'rxjs';
/**
 * Avatar stored in user profile.
 */
export interface UserProfileAvatarData {
    /**
     * Optional initials (two letters) of the user to use as avatar if avatar picture isn't specified.
     */
    initials?: string;
    /**
     * Background color of the avatar when initials are used.
     */
    color?: string;
    /**
     * Base64 data URL for the user avatar image.
     */
    imageUrl?: string | null;
}
export type DarkModeValue = 'system' | 'dark' | 'light' | 'space_default';
export type ContrastModeValue = 'system' | 'standard' | 'high';
/**
 * User settings stored in the data object of the User Profile
 */
export interface UserSettingsData {
    darkMode?: DarkModeValue;
    contrastMode?: ContrastModeValue;
    solutionNavOptOut?: boolean;
}
export interface UserProfileData {
    avatar?: UserProfileAvatarData;
    userSettings?: UserSettingsData;
    [key: string]: unknown;
}
export interface UserProfileAPIClient {
    userProfile$: Observable<UserProfileData | null>;
    enabled$: Observable<boolean>;
    userProfileLoaded$: Observable<boolean>;
    partialUpdate: <D extends Partial<UserProfileData>>(data: D) => Promise<void>;
}
