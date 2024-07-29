/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Result } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { Connector } from '../types/connectors';

export const updateConnectorNameAndDescription = async (
  client: ElasticsearchClient,
  connectorId: string,
  connectorUpdates: Partial<Pick<Connector, 'name' | 'description'>>
): Promise<Result> => {
  const { name, description } = connectorUpdates;
  const result = await client.transport.request<Result>({
    method: 'PUT',
    path: `/_connector/${connectorId}/_name`,
    body: {
      name,
      description,
    },
  });
  return result;
};
