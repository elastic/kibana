/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';
import type { UserProfileGetCurrentParams } from '@kbn/core-user-profile-server';
import type {
  UserProfileData,
  UserProfileLabels,
  UserProfileWithSecurity,
} from '@kbn/core-user-profile-common';

/**
 * Retrieves the user profile of the user of the current HTTP request or `null` if the profile is not available.
 * @see {@link UserProfileWithSecurity}
 * @public
 */
export type IUserProfileAccessor = <D extends UserProfileData, L extends UserProfileLabels>(
  options?: Pick<UserProfileGetCurrentParams, 'dataPath'>
) => Promise<UserProfileWithSecurity<D, L> | null>;

/**
 * Retrieves the user profile identifier of the user of the current HTTP request or `null` if the profile is not available.
 * @public
 */
export type IUserProfileIdAccessor = () => Promise<string | null>;

/**
 * The accessor retrieving the user profile in the current HTTP request context.
 * @public
 */
export const UserProfileAccessor: ServiceToken<IUserProfileAccessor> =
  createToken('UserProfileAccessor');

/**
 * The accessor retrieving the user profile identifier in the current HTTP request context.
 * @public
 */
export const UserProfileIdAccessor: ServiceToken<IUserProfileIdAccessor> =
  createToken('UserProfileIdAccessor');
