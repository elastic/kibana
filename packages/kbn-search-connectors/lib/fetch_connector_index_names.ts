/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { fetchConnectors } from './fetch_connectors';
import { isIndexNotFoundException } from '../utils/identify_exceptions';

export async function fetchConnectorIndexNames(client: ElasticsearchClient): Promise<string[]> {
  try {
    const allConnectors = await fetchConnectors(client);
    return (allConnectors ?? []).map((connector) => connector.index_name ?? '');
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return [];
    }
    throw error;
  }
}
