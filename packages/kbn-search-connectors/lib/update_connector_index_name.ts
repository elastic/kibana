/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Result } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export const updateConnectorIndexName = async (
  client: ElasticsearchClient,
  connectorId: string,
  indexName: string | null
): Promise<Result> => {
  return await client.transport.request<Result>({
    method: 'PUT',
    path: `/_connector/${connectorId}/_index_name`,
    body: {
      index_name: indexName,
    },
  });
};
