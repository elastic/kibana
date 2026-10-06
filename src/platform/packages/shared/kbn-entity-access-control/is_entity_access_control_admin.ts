/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';

// Unregistered so ordinary feature grants do not confer ACL administration.
export const ENTITY_ACCESS_CONTROL_ADMIN_ACTION = 'entity_access_control:admin';

/** Checks administrative application privileges without granting API keys an override. */
export const isEntityAccessControlAdmin = async (
  core: { security: SecurityServiceStart },
  request?: KibanaRequest,
  authz?: { checkPrivilegesWithRequest: CheckPrivilegesWithRequest }
): Promise<boolean> => {
  if (!request || !authz) return false;
  const user = core.security.authc.getCurrentUser(request);
  if (!user || user.authentication_type === 'api_key') return false;

  try {
    const { hasAllRequested: isAdmin } = await authz
      .checkPrivilegesWithRequest(request)
      .globally({ kibana: [ENTITY_ACCESS_CONTROL_ADMIN_ACTION] });
    return isAdmin;
  } catch {
    return false;
  }
};
