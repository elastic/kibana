/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { UserAvatar, UserAvatarProps } from './user_avatar';
import mdx from './README.mdx';
import { UserProfileUserInfo } from './user_profile';

export default {
  title: 'Avatar/User Profile',
  description: '',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

type UserAvatarParams = Pick<UserAvatarProps, 'user'>;

export const userAvatar = (
  params: Pick<UserProfileUserInfo, 'username'>,
  rest: UserAvatarParams
) => {
  return <UserAvatar {...params} {...rest} />;
};

userAvatar.argTypes = {
  username: {
    control: { type: 'radio' },
    options: ['Peggy', 'Burt', 'Leonardo DiCaprio'],
    defaultValue: 'Peggy',
  },
};
