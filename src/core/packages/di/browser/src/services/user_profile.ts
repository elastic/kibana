/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';

/**
 * The user profile API.
 * @see {@link UserProfileServiceStart}
 * @public
 */
export type IUserProfile = UserProfileServiceStart;

/**
 * The user profile service.
 * @see {@link IUserProfile}
 * @public
 */
export const UserProfile: ServiceToken<IUserProfile> = createToken('UserProfile');
