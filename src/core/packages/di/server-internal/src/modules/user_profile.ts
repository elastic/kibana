/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { cacheInScope } from '@kbn/core-di-internal';
import {
  CoreStart,
  type IUserProfileAccessor,
  Request,
  UserProfileAccessor,
  UserProfileIdAccessor,
} from '@kbn/core-di-server';

export function loadUserProfile({ bind }: ContainerModuleLoadOptions): void {
  bind(UserProfileAccessor)
    .toResolvedValue(
      (userProfile, request): IUserProfileAccessor =>
        (options) =>
          userProfile.getCurrent({ ...options, request }),
      [CoreStart('userProfile'), Request]
    )
    .inRequestScope()
    .onActivation(cacheInScope(UserProfileAccessor));

  bind(UserProfileIdAccessor)
    .toResolvedValue(
      (userProfile, request) => () => userProfile.getCurrentProfileId({ request }),
      [CoreStart('userProfile'), Request]
    )
    .inRequestScope()
    .onActivation(cacheInScope(UserProfileIdAccessor));
}
