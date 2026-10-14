/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';

/**
 * The currently authenticated user.
 *
 * This binding resolves asynchronously (via `CoreAuthenticationService.getCurrentUser`)
 * and should be consumed with `container.getAsync` or within an asynchronous resolution chain.
 * @public
 */
export const CurrentUser: ServiceToken<AuthenticatedUser> = createToken('CurrentUser');
