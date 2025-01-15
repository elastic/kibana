/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Result } from '@elastic/elasticsearch/lib/api/types';

export const updateConnectorApiKeyId = async (
  client: ElasticsearchClient,
  connectorId: string,
  apiKeyId: string | null,
  apiKeySecretId: string | null
) => {
  return await client.transport.request<Result>({
    method: 'PUT',
    path: `/_connector/${connectorId}/_api_key_id`,
    body: {
      api_key_id: apiKeyId,
      api_key_secret_id: apiKeySecretId,
    },
  });
};
