/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';

/** Checks administrative application privileges without granting API keys an override. */
export const isEntityAccessControlAdmin = async (
  core: { security: SecurityServiceStart; elasticsearch: ElasticsearchServiceStart },
  request?: KibanaRequest
): Promise<boolean> => {
  if (!request) return false;
  const user = core.security.authc.getCurrentUser(request);
  if (!user || user.authentication_type === 'api_key') return false;

  try {
    const { has_all_requested: isAdmin } = await core.elasticsearch.client
      .asScoped(request)
      .asCurrentUser.security.hasPrivileges({
        application: [
          {
            application: 'kibana-.kibana',
            resources: ['*'],
            // Unregistered so ordinary feature grants do not confer ACL administration.
            privileges: ['entity_access_control:admin'],
          },
        ],
      });
    return isAdmin;
  } catch {
    return false;
  }
};
