/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '../elasticsearch_client';

export const setPolicy = async (
  esClient: ElasticsearchClient,
  policy: string,
  body: Record<string, unknown>
): Promise<unknown> => {
  return (
    await esClient.transport.request({
      path: `/_ilm/policy/${policy}`,
      method: 'PUT',
      body,
    })
  ).body;
};
