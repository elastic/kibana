/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';
import { userInfo } from 'os';

export const createSecuritySuperuser = async (
  esClient: Client,
  username: string = userInfo().username,
  password: string = 'changeme'
): Promise<{ username: string; password: string; created: boolean }> => {
  if (!username || !password) {
    throw new Error(`username and password require values.`);
  }

  // Create a role which has full access to restricted indexes
  await esClient.transport.request({
    method: 'POST',
    path: '_security/role/superuser_restricted_indices',
    body: {
      cluster: ['all'],
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
          allow_restricted_indices: true,
        },
        {
          names: ['*'],
          privileges: ['monitor', 'read', 'view_index_metadata', 'read_cross_cluster'],
          allow_restricted_indices: true,
        },
      ],
      applications: [
        {
          application: '*',
          privileges: ['*'],
          resources: ['*'],
        },
      ],
      run_as: ['*'],
    },
  });

  const addedUser = await esClient.transport.request<Promise<{ created: boolean }>>({
    method: 'POST',
    path: `_security/user/${username}`,
    body: {
      password,
      roles: ['superuser', 'kibana_system', 'superuser_restricted_indices'],
      full_name: username,
    },
  });

  return {
    created: addedUser.created,
    username,
    password,
  };
};
