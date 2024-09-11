/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent } from 'react';
import { UserAvatarTip, UserToolTip } from '@kbn/user-profile-components';
import type { UserProfile, UserProfileAvatarData } from '@kbn/user-profile-components';
import { EuiCommentList, EuiComment } from '@elastic/eui';
import { PanelWithCodeBlock } from './panel_with_code_block';

export const ToolTipDemo: FunctionComponent = () => {
  const userProfile: UserProfile<{ avatar: UserProfileAvatarData }> = {
    uid: 'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
    enabled: true,
    user: {
      username: 'wet_dingo',
      email: 'wet_dingo@elastic.co',
      full_name: 'Wet Dingo',
    },
    data: {
      avatar: {
        color: '#09e8ca',
        initials: 'WD',
        imageUrl: 'https://source.unsplash.com/64x64/?dingo',
      },
    },
  };

  return (
    <PanelWithCodeBlock title="Tooltip" code={code}>
      <EuiCommentList>
        <EuiComment
          timelineAvatar={
            <UserAvatarTip user={userProfile.user} avatar={userProfile.data.avatar} />
          }
          username={
            <UserToolTip
              position="top"
              delay="regular"
              user={userProfile.user}
              avatar={userProfile.data.avatar}
            >
              <strong>{userProfile.user.full_name}</strong>
            </UserToolTip>
          }
          event="pushed incident X0Z235 on Jan 3, 2020"
        />
      </EuiCommentList>
    </PanelWithCodeBlock>
  );
};

const code = `import { UserToolTip, UserAvatarTip } from '@kbn/user-profile-components';

<UserToolTip user={userProfile.user} avatar={userProfile.data.avatar}>
  <!-- An inline element to trigger the tooltip -->
</UserToolTip>

<UserAvatarTip user={userProfile.user} avatar={userProfile.data.avatar} />`;
