/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import type { UserProfileData, UserProfileLabels } from '@kbn/core-user-profile-common';
import { cacheInScope } from '@kbn/core-di-internal';
import {
  CoreStart,
  CurrentUserProfileId,
  type IUserProfileFactory,
  Request,
  UserProfileFactory,
} from '@kbn/core-di-server';

export function loadUserProfile({ bind }: ContainerModuleLoadOptions): void {
  bind(UserProfileFactory)
    .toResolvedValue(
      (userProfile, request): IUserProfileFactory =>
        <D extends UserProfileData, L extends UserProfileLabels>(
          options?: Parameters<IUserProfileFactory>[0]
        ) =>
          userProfile.getCurrent<D, L>({ ...options, request }),
      [CoreStart('userProfile'), Request]
    )
    .inRequestScope()
    .onActivation(cacheInScope(UserProfileFactory));

  bind(CurrentUserProfileId)
    .toResolvedValue(
      (userProfile, request) => userProfile.getCurrentProfileId({ request }),
      [CoreStart('userProfile'), Request]
    )
    .inRequestScope()
    .onActivation(cacheInScope(CurrentUserProfileId));
}
