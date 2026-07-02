import type { EuiAvatarProps } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import type { UserProfile, UserProfileUserInfo } from '@kbn/core-user-profile-common';
import type { UserProfileAvatarData } from './types';
/**
 * Convenience type for a {@link UserProfile} with avatar data
 */
export type UserProfileWithAvatar = UserProfile<{
    avatar?: UserProfileAvatarData;
}>;
/**
 * Props of {@link UserAvatar} component
 */
export interface UserAvatarProps extends Omit<EuiAvatarProps, 'initials' | 'initialsLength' | 'imageUrl' | 'iconType' | 'iconSize' | 'iconColor' | 'name' | 'color' | 'type'> {
    /**
     * User to be rendered
     */
    user?: UserProfileUserInfo;
    /**
     * Avatar data of user to be rendered
     */
    avatar?: UserProfileAvatarData;
}
/**
 * Renders an avatar given a user profile
 */
export declare const UserAvatar: FunctionComponent<UserAvatarProps>;
