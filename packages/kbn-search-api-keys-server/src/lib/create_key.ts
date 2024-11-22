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
import type { APIKeyCreationResponse } from '../../types';

export async function createAPIKey(
  name: string,
  client: ElasticsearchClient,
  logger: Logger
): Promise<APIKeyCreationResponse> {
  try {
    const apiKey = await client.security.createApiKey({
      name,
      role_descriptors: {},
    });

    return apiKey;
  } catch (e) {
    logger.error(`Search API Keys: Error during creating API Key`);
    logger.error(e);
    throw e;
  }
}
