/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiAvatarProps } from '@elastic/eui';
import { EuiAvatar, useEuiTheme } from '@elastic/eui';
import type { FunctionComponent, HTMLAttributes } from 'react';
import React from 'react';

import type { UserProfile, UserProfileAvatarData } from './imported_types/user_profile';
import {
  getUserAvatarColor,
  getUserAvatarInitials,
  USER_AVATAR_MAX_INITIALS,
} from './imported_types/user_profile';
import { getUserDisplayName } from './imported_types/user';

export type UserProfileWithAvatar = UserProfile<{ avatar?: UserProfileAvatarData }>;

export interface UserAvatarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  userProfile?: UserProfileWithAvatar;
  size?: EuiAvatarProps['size'];
  isDisabled?: EuiAvatarProps['isDisabled'];
}

export const UserAvatar: FunctionComponent<UserAvatarProps> = ({ userProfile, ...rest }) => {
  const { euiTheme } = useEuiTheme();

  if (!userProfile) {
    return <EuiAvatar name="" color={euiTheme.colors.lightestShade} initials="?" {...rest} />;
  }

  const displayName = getUserDisplayName(userProfile.user);

  if (userProfile.data.avatar?.imageUrl) {
    return (
      <EuiAvatar
        name={displayName}
        imageUrl={userProfile.data.avatar.imageUrl}
        color="plain"
        {...rest}
      />
    );
  }

  return (
    <EuiAvatar
      name={displayName}
      initials={getUserAvatarInitials(userProfile.user, userProfile.data.avatar)}
      initialsLength={USER_AVATAR_MAX_INITIALS}
      color={getUserAvatarColor(userProfile.user, userProfile.data.avatar)}
      {...rest}
    />
  );
};
