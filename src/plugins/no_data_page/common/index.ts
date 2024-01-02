/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @internal
 */
export const NO_DATA_API_PATHS: Record<string, Record<string, string>> = {
  internal: {
    /**
     * Use the Security plugin's endpoint
     * to determine if the user has active API Keys
     */
    hasApiKeys: '/internal/security/api_key/_has_active',
  },
};
