/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { UserProfileRequestHandlerContext } from '@kbn/core-user-profile-server';
import type {
  UserProfileData,
  UserProfileLabels,
  UserProfileWithSecurity,
} from '@kbn/core-user-profile-common';
import type { InternalUserProfileServiceStart } from './internal_contracts';

export class CoreUserProfileRouteHandlerContext implements UserProfileRequestHandlerContext {
  constructor(
    private readonly userProfileStart: InternalUserProfileServiceStart,
    private readonly request: KibanaRequest
  ) {}

  getCurrent<D extends UserProfileData, L extends UserProfileLabels>(
    dataPath?: string
  ): Promise<UserProfileWithSecurity<D, L> | null> {
    return this.userProfileStart.getCurrent({ request: this.request, dataPath });
  }
}
