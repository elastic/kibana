/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiText, EuiToolTipProps } from '@elastic/eui';
import { EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import type { UserProfileUserInfo } from './user_profile';
import { UserAvatar } from './user_avatar';
import { getUserDisplayName } from './user_profile';
import { UserProfileAvatarData } from './types';

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
