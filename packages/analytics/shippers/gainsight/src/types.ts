/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Definition of the gainSight API.
 */
export interface GainSightApi {
  init: boolean;
  /**
   * Identify a User
   * @param userId
   * @param userVars
   */
  identify(userId: string, userVars?: Record<string, unknown>): void;
}

declare global {
  interface Window {
    aptrinsic: GainSightApi;
  }
}
