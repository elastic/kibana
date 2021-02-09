/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from '../../../../../../src/core/types';

export const SEARCH_SESSIONS_FEATURE_ID = 'search_sessions';
export const SEARCH_SESSIONS_MANAGEMENT_ID = 'search_sessions';

/**
 * Represent the UI capabilities for the `search_sessions` section of `Capabilities`
 *
 * TODO: granular control of what exactly users can do with their search sessions
 * currently only `create` is available which serves as global ON/OFF switch
 */
export interface SearchSessionsCapabilities {
  create: boolean;
}

export const getSearchSessionsCapabilities = (
  capabilities: Capabilities
): SearchSessionsCapabilities => {
  const rawTagCapabilities = capabilities[SEARCH_SESSIONS_FEATURE_ID];
  return {
    create: (rawTagCapabilities?.create as boolean) ?? false,
  };
};
