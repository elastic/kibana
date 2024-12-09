/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent } from 'react';
import { EuiTitle, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { UserAvatar } from '@kbn/user-profile-components';
import type { UserProfile, UserProfileAvatarData } from '@kbn/user-profile-components';
import { PanelWithCodeBlock } from './panel_with_code_block';

export const AvatarDemo: FunctionComponent = () => {
  const { euiTheme } = useEuiTheme();
  const userProfile: UserProfile<{ avatar: UserProfileAvatarData }> = {
    uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
    enabled: true,
    user: {
      username: 'delighted_nightingale',
      email: 'delighted_nightingale@elastic.co',
      full_name: 'Delighted Nightingale',
    },
    data: {
      avatar: {
        color: euiTheme.colors.vis.euiColorVis1,
        initials: 'DN',
        imageUrl: 'https://source.unsplash.com/64x64/?cat',
      },
    },
  };

  return (
    <PanelWithCodeBlock title="Avatar" code={code}>
      <UserAvatar
        user={userProfile.user}
        avatar={{ ...userProfile.data.avatar, imageUrl: undefined }}
      />
      &ensp;
      <UserAvatar user={userProfile.user} avatar={userProfile.data.avatar} />
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h3>Disabled</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <UserAvatar
        user={userProfile.user}
        avatar={{ ...userProfile.data.avatar, imageUrl: undefined }}
        isDisabled
      />
      &ensp;
      <UserAvatar user={userProfile.user} avatar={userProfile.data.avatar} isDisabled />
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h3>Unknown</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <UserAvatar />
    </PanelWithCodeBlock>
  );
};

const code = `import { UserAvatar } from '@kbn/user-profile-components';

const userProfile = {
  uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
  enabled: true,
  user: {
    username: 'delighted_nightingale',
    email: 'delighted_nightingale@elastic.co',
    full_name: 'Delighted Nightingale',
  },
  data: {
    avatar: {
      color: '#09e8ca',
      initials: 'DN',
      imageUrl: 'https://source.unsplash.com/64x64/?cat'
    }
  },
};

<UserAvatar user={userProfile.user} avatar={userProfile.data.avatar} />`;
