/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Capabilities } from '@kbn/core/public';

/**
 * The contract that is used to check anonymous access for the purposes of sharing public links. The implementation is intended to be
 * provided by the security plugin.
 */
export interface AnonymousAccessServiceContract {
  /**
   * This function returns the current state of anonymous access.
   */
  getState: () => Promise<AnonymousAccessState>;
  /**
   * This function returns the capabilities of the anonymous access user.
   */
  getCapabilities: () => Promise<Capabilities>;
}

/**
 * The state of anonymous access.
 */
export interface AnonymousAccessState {
  /**
   * Whether anonymous access is enabled or not.
   */
  isEnabled: boolean;
  /**
   * If anonymous access is enabled, this reflects what URL parameters need to be added to a Kibana link to make it publicly accessible.
   * Note that if anonymous access is the only authentication method, this will be null.
   */
  accessURLParameters: Record<string, string> | null;
}
