/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { UserAvatarTip as UserAvatarTipComponent } from '@kbn/user-profile-components';
import { useQuery } from '@tanstack/react-query';
import { useServices } from '../services';

export function UserAvatarTip(props: { uid: string }) {
  const { getUserProfile } = useServices();
  const query = useQuery(
    ['user-profile', props.uid],
    async () => {
      return getUserProfile(props.uid);
    },
    { staleTime: Infinity }
  );

  if (query.data) {
    return (
      <UserAvatarTipComponent
        user={query.data.user}
        avatar={query.data.data.avatar}
        size={'s'}
        data-test-subj={`userAvatarTip-${query.data.user.username}`}
      />
    );
  }

  return null;
}
