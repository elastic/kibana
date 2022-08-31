/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { UserAvatar, UserAvatarProps } from './user_avatar';
import mdx from '../README.mdx'

export default {
  title: 'Avatar/User Profile',
  description: '',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};



export const userAvatar = ({ user, ...rest }: UserAvatarProps) => {
  return <UserAvatar user={{ username: userAvatar.argTypes.username.defaultValue }} {...rest} />;
};



userAvatar.argTypes = {
  username: {
    control: 'text',
    defaultValue: 'Peggy',
  },
};

console.log(userAvatar.argTypes.username)


