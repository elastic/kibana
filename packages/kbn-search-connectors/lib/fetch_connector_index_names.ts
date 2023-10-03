/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '..';
import { isIndexNotFoundException } from '../utils/identify_exceptions';

export async function fetchConnectorIndexNames(client: ElasticsearchClient): Promise<string[]> {
  try {
    const result = await client.search({
      _source: false,
      fields: [{ field: 'index_name' }],
      index: CONNECTORS_INDEX,
      size: 10000,
    });
    return (result?.hits.hits ?? []).map((field) => field.fields?.index_name[0] ?? '');
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return [];
    }
    throw error;
  }
}
