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

export const putUpdateNative = async (
  client: ElasticsearchClient,
  connectorId: string,
  isNative: boolean
) => {
  const result = await client.transport.request<Result>({
    method: 'PUT',
    path: `/_connector/${connectorId}/_native`,
    body: {
      is_native: isNative,
    },
  });
  return result;
};
