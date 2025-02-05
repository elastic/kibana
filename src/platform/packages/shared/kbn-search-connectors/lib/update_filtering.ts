/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Result } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { fetchConnectorById } from './fetch_connectors';
import { FilteringRules } from '../types/connectors';

export const updateFiltering = async (
  client: ElasticsearchClient,
  connectorId: string
): Promise<FilteringRules | undefined> => {
  const activateDraftFilteringResult = await client.transport.request<{ result: Result }>({
    method: 'PUT',
    path: `/_connector/${connectorId}/_filtering/activate`,
  });

  if (activateDraftFilteringResult.result === 'updated') {
    const connector = await fetchConnectorById(client, connectorId);
    return connector?.filtering?.[0]?.active;
  }
  return undefined;
};
