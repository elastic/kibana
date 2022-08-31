/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { UserAvatar, UserAvatarProps } from './user_avatar';
// import mdx from '../README.mdx'

export default {
  title: 'Avatar/User Profile',
  description: '',
  parameters: {
    // docs: {
    //   page: mdx,
    // },
  },
};

type userAvatarNameParams = Pick<UserAvatarProps, 'user'>;

export const userAvatar = (params: userAvatarNameParams) => {
  return (
    <UserAvatar
      {...(params.user?.username !== undefined
        ? userAvatar.argTypes.user
        : userAvatar.argTypes.user.defaultValue)}
      {...params}
    />
  );
};

userAvatar.argTypes = {
  user: {
    control: 'text',
    defaultValue: 'Peggy',
  },
};
