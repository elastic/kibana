/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

export async function fetchUserStartPrivileges(
  client: ElasticsearchClient,
  logger: Logger
): Promise<boolean> {
  try {
    // relying on manage cluster privilege to check if user can create API keys
    // and can also have permissions for index monitoring
    const securityCheck = await client.security.hasPrivileges({
      cluster: ['manage'],
      index: [
        {
          names: ['*'],
          privileges: ['read', 'write'],
        },
      ],
    });

    return securityCheck.has_all_requested ?? false;
  } catch (e) {
    logger.error(`Error checking user privileges for search API Keys`);
    logger.error(e);
    return false;
  }
}

export async function fetchClusterHasApiKeys(
  client: ElasticsearchClient,
  logger: Logger
): Promise<boolean> {
  try {
    const clusterApiKeys = await client.security.queryApiKeys({
      query: {
        term: {
          invalidated: false,
        },
      },
    });
    return clusterApiKeys.api_keys.length > 0;
  } catch (e) {
    logger.error(`Error checking cluster for existing valid API keys`);
    logger.error(e);
    return true;
  }
}
