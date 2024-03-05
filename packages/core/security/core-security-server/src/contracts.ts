/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreAuthenticationService } from './authc';
import type { CoreInternalSecurityContract } from './api_provider';

/**
 * Setup contract for Core's security service.
 *
 * @public
 */
export interface CoreSecuritySetup {
  /**
   * Register the security implementation that then will be used and re-exposed by Core.
   *
   * @remark this should **exclusively** be used by the security plugin.
   */
  registerSecurityApi(api: CoreInternalSecurityContract): void;
}

/**
 * Start contract for Core's security service.
 *
 * @public
 */
export interface CoreSecurityStart {
  /**
   * The {@link CoreAuthenticationService | authentication service}
   */
  authc: CoreAuthenticationService;
}
