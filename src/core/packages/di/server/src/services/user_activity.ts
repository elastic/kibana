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
import type { UserActivityServiceSetup } from '@kbn/core-user-activity-server';

/**
 * The user activity tracking API.
 * @see {@link UserActivityServiceSetup}
 * @public
 */
export type IUserActivity = UserActivityServiceSetup;

/**
 * The user activity tracking service.
 * @see {@link IUserActivity}
 * @public
 */
export const UserActivity: ServiceToken<IUserActivity> = createToken('UserActivity');
