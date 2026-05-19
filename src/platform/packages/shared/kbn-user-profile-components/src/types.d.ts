import type { Observable } from 'rxjs';
import type { SupportedLocaleId } from '@kbn/i18n';
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
 * Value stored in the user profile for the display language.
 *
 * An empty string `""` means "no explicit choice" (fall back to the server-configured
 * locale at render time). A `SupportedLocaleId` means the user has picked that locale.
 */
export type LocaleValue = SupportedLocaleId | '';
/**
 * User settings stored in the data object of the User Profile
 */
export interface UserSettingsData {
    darkMode?: DarkModeValue;
    contrastMode?: ContrastModeValue;
    locale?: LocaleValue;
    solutionNavOptOut?: boolean;
    /**
     * Whether the Agent Builder announcement modal was dismissed for the current user (all spaces).
     */
    agentBuilderAnnouncementModalSeen?: boolean;
    /**
     * Legacy: stringified JSON map of space id → dismissed (`true`). Superseded by
     * `agentBuilderAnnouncementModalSeen`; read for backward compatibility.
     */
    agentBuilderAnnouncementModalSeenBySpaceJson?: string;
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
