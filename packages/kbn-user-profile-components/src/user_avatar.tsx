/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiAvatarProps } from '@elastic/eui';
import { EuiAvatar, useEuiTheme } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import type { UserProfileAvatarData } from './types';
import type { UserProfile, UserProfileUserInfo } from './user_profile';
import {
  getUserAvatarColor,
  getUserAvatarInitials,
  getUserDisplayLabel,
  USER_AVATAR_MAX_INITIALS,
} from './user_profile';

/**
 * Convenience type for a {@link UserProfile} with avatar data
 */
export type UserProfileWithAvatar = UserProfile<{ avatar?: UserProfileAvatarData }>;

/**
 * Props of {@link UserAvatar} component
 */
export interface UserAvatarProps
  extends Omit<
    EuiAvatarProps,
    | 'initials'
    | 'initialsLength'
    | 'imageUrl'
    | 'iconType'
    | 'iconSize'
    | 'iconColor'
    | 'name'
    | 'color'
    | 'type'
  > {
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
export const UserAvatar: FunctionComponent<UserAvatarProps> = ({ user, avatar, ...rest }) => {
  const { euiTheme } = useEuiTheme();

  if (!user) {
    return <EuiAvatar name="" color={euiTheme.colors.lightestShade} initials="?" {...rest} />;
  }

  const displayLabel = getUserDisplayLabel(user);

  if (avatar?.imageUrl) {
    return <EuiAvatar name={displayLabel} imageUrl={avatar.imageUrl} color="plain" {...rest} />;
  }

  return (
    <EuiAvatar
      name={displayLabel}
      initials={getUserAvatarInitials(user, avatar)}
      initialsLength={USER_AVATAR_MAX_INITIALS}
      color={getUserAvatarColor(user, avatar)}
      {...rest}
    />
  );
};
