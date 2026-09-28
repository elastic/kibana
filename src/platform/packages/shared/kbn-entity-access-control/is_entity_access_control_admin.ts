/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';

/** Checks wildcard application privileges with the caller's credentials, including API-key limits. */
export const isEntityAccessControlAdmin = async (
  core: Pick<CoreStart, 'elasticsearch'>,
  request?: KibanaRequest
): Promise<boolean> => {
  if (!request) return false;
  try {
    const result = await core.elasticsearch.client
      .asScoped(request)
      .asCurrentUser.security.hasPrivileges({
        application: [
          {
            application: 'kibana-.kibana',
            resources: ['*'],
            // An unregistered privilege excludes ordinary Kibana feature and base privileges.
            privileges: ['entity_access_control:admin'],
          },
        ],
      });
    return result.has_all_requested;
  } catch {
    return false;
  }
};
