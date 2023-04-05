/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import type { UserAvatarProps } from './user_avatar';
import { UserAvatar } from './user_avatar';
import { UserToolTip } from './user_tooltip';

/**
 * Renders a user avatar with tooltip
 */
export const UserAvatarTip: FunctionComponent<UserAvatarProps> = ({ user, avatar, ...rest }) => {
  if (!user) {
    return <UserAvatar {...rest} />;
  }

  return (
    <UserToolTip user={user} avatar={avatar} position="top" delay="regular">
      <UserAvatar user={user} avatar={avatar} {...rest} />
    </UserToolTip>
  );
};
