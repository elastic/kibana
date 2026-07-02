import type { EuiToolTipProps } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import type { UserProfileUserInfo } from '@kbn/core-user-profile-common';
import type { UserProfileAvatarData } from './types';
/**
 * Props of {@link UserToolTip} component
 */
export interface UserToolTipProps extends Omit<EuiToolTipProps, 'content' | 'title'> {
    /**
     * User to be rendered
     */
    user: UserProfileUserInfo;
    /**
     * Avatar data of user to be rendered
     */
    avatar?: UserProfileAvatarData;
}
/**
 * Renders a tooltip with user information
 */
export declare const UserToolTip: FunctionComponent<UserToolTipProps>;
