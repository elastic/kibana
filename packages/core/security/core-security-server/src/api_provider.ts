/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreAuthenticationService } from './authc';

/**
 * The contract exposed by the security provider for Core to
 * consume and re-expose via its security service.
 *
 * @public
 */
export interface CoreSecurityContract {
  authc: AuthenticationServiceContract;
}

/**
 * @public
 */
export type AuthenticationServiceContract = CoreAuthenticationService;
