/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
            'create_snapshot',
            'manage',
            'manage_api_key',
            'manage_ccr',
            'manage_transform',
            'manage_ilm',
            'manage_index_templates',
            'manage_ingest_pipelines',
            'manage_ml',
            'manage_own_api_key',
            'manage_pipeline',
            'manage_rollup',
            'manage_saml',
            'manage_security',
            'manage_token',
            'manage_watcher',
            'monitor',
            'monitor_transform',
            'monitor_ml',
            'monitor_rollup',
            'monitor_watcher',
            'read_ccr',
            'read_ilm',
            'transport_client',
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
                'manage_follow_index',
                'manage_ilm',
                'manage_leader_index',
                'monitor',
                'read',
                'read_cross_cluster',
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
