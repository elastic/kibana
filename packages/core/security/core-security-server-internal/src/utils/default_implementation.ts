/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';

const API_KEYS_DISABLED_ERROR = new Error('API keys are disabled');

export const getDefaultSecurityImplementation = (): CoreSecurityDelegateContract => {
  return {
    authc: {
      getCurrentUser: () => null,
      apiKeys: {
        areAPIKeysEnabled: () => Promise.resolve(false),
        areCrossClusterAPIKeysEnabled: () => Promise.resolve(false),
        create: () => Promise.reject(API_KEYS_DISABLED_ERROR),
        update: () => Promise.reject(API_KEYS_DISABLED_ERROR),
        grantAsInternalUser: () => Promise.reject(API_KEYS_DISABLED_ERROR),
        validate: () => Promise.reject(API_KEYS_DISABLED_ERROR),
        invalidate: () => Promise.reject(API_KEYS_DISABLED_ERROR),
        invalidateAsInternalUser: () => Promise.reject(API_KEYS_DISABLED_ERROR),
      },
    },
    audit: {
      asScoped: () => {
        return { log: () => undefined, enabled: false };
      },
      withoutRequest: {
        log: () => undefined,
        enabled: false,
      },
    },
  };
};
