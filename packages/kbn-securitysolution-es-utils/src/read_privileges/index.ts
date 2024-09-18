/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '../elasticsearch_client';

export const readPrivileges = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<unknown> => {
  return (
    await esClient.security.hasPrivileges(
      {
        body: {
          cluster: [
            'all',
            'manage',
            'manage_api_key',
            'manage_transform',
            'manage_index_templates',
            'manage_ml',
            'manage_own_api_key',
            'manage_pipeline',
            'manage_security',
            'monitor',
            'monitor_transform',
            'monitor_ml',
          ],
          index: [
            {
              names: [index],
              privileges: [
                'all',
                'create',
                'create_doc',
                'create_index',
                'delete',
                'delete_index',
                'index',
                'manage',
                'maintenance',
                'monitor',
                'read',
                'view_index_metadata',
                'write',
              ],
            },
          ],
        },
      },
      { meta: true }
    )
  ).body;
};
