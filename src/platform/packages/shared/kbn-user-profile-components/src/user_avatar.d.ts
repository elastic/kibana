import type { EuiAvatarProps } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import type { UserProfileAvatarData } from './types';
import type { UserProfile, UserProfileUserInfo } from './user_profile';
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
