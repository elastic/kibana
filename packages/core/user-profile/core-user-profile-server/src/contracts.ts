/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UserProfileService } from './service';
import type { CoreUserProfileDelegateContract } from './api_provider';

/**
 * Setup contract for Core's userProfile service.
 *
 * @public
 */
export interface UserProfileServiceSetup {
  /**
   * Register the userProfile implementation that will be used and re-exposed by Core.
   *
   * @remark this should **exclusively** be used by the security plugin.
   */
  registerUserProfileDelegate(delegate: CoreUserProfileDelegateContract): void;
}

/**
 * Start contract for Core's userProfile service.
 *
 * @public
 */
export type UserProfileServiceStart = UserProfileService;
