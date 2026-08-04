import type { Observable } from 'rxjs';
import type { UserProfileData } from '@kbn/core-user-profile-common';
import type { ContrastModeValue, DarkModeValue, LocaleValue, UserProfileAvatarData, UserSettingsData } from '@kbn/core-user-settings-types';
export type { UserProfileAvatarData, DarkModeValue, ContrastModeValue, LocaleValue, UserSettingsData, UserProfileData, };
export interface UserProfileAPIClient {
    userProfile$: Observable<UserProfileData | null>;
    enabled$: Observable<boolean>;
    userProfileLoaded$: Observable<boolean>;
    partialUpdate: <D extends Partial<UserProfileData>>(data: D) => Promise<void>;
}
