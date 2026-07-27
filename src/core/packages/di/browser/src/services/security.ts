/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreAuthenticationService } from '@kbn/core-security-browser';
import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';

/**
 * Retrieves the currently authenticated user and throws if the current user is not authenticated.
 * @see {@link CoreAuthenticationService.getCurrentUser}
 * @public
 */
export type ICurrentUserAccessor = CoreAuthenticationService['getCurrentUser'];

/**
 * The accessor retrieving the currently authenticated user.
 * @see {@link ICurrentUserAccessor}
 * @public
 */
export const CurrentUserAccessor: ServiceToken<ICurrentUserAccessor> =
  createToken('CurrentUserAccessor');
