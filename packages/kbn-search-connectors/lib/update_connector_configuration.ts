/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { Result } from '@elastic/elasticsearch/lib/api/types';
import { fetchConnectorById } from './fetch_connectors';

export const updateConnectorConfiguration = async (
  client: ElasticsearchClient,
  connectorId: string,
  configuration: Record<string, string | number | boolean>
) => {
  await client.transport.request<Result>({
    method: 'PUT',
    path: `/_connector/${connectorId}/_configuration`,
    body: {
      values: configuration,
    },
  });
  const connector = await fetchConnectorById(client, connectorId);
  return connector?.configuration;
};
