/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiToolTipProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import type { UserProfileAvatarData } from './types';
import { UserAvatar } from './user_avatar';
import type { UserProfileUserInfo } from './user_profile';
import { getUserDisplayName } from './user_profile';

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
export const UserToolTip: FunctionComponent<UserToolTipProps> = ({ user, avatar, ...rest }) => {
  const displayName = getUserDisplayName(user);
  return (
    <EuiToolTip
      content={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <UserAvatar user={user} avatar={avatar} size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow style={{ minWidth: 0 }}>
            <div>{displayName}</div>
            {user.email && user.email !== displayName ? (
              <EuiText size={'xs'}>{user.email}</EuiText>
            ) : undefined}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      {...rest}
    />
  );
};
