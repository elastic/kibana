/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import type { InternalSecurityServiceStart } from '../internal_contracts';

export const convertSecurityApi = (
  privateApi: CoreSecurityDelegateContract,
  logger: Logger
): InternalSecurityServiceStart => {
  const fakeRequestUsers = new WeakMap<KibanaRequest, AuthenticatedUser>();
  const getCurrentUser = (request: KibanaRequest): AuthenticatedUser | null => {
    if (request.isFakeRequest) {
      const override = fakeRequestUsers.get(request);
      if (override) return override;
    }
    return privateApi.authc.getCurrentUser(request);
  };

  const enrichRequestWithUserProfile = (request: KibanaRequest, userProfileId: string): void => {
    logger.debug(`Enriching request with user profile ID "${userProfileId}".`);
    const minimalUser: AuthenticatedUser = {
      username: '',
      roles: [],
      enabled: true,
      metadata: { _reserved: false },
      authentication_realm: { name: 'background_task', type: 'background_task' },
      lookup_realm: { name: 'background_task', type: 'background_task' },
      authentication_type: '',
      authentication_provider: { type: 'background_task', name: 'background_task' },
      elastic_cloud_user: false,
      profile_uid: userProfileId,
    };
    fakeRequestUsers.set(request, minimalUser);
  };

  return {
    authc: {
      getCurrentUser,
      enrichRequestWithUserProfile,
      getRedactedSessionId: privateApi.authc.getRedactedSessionId,
      apiKeys: privateApi.authc.apiKeys,
    },
    audit: privateApi.audit,
  };
};
