/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../elasticsearch_client';

export const getIndexExists = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<boolean> => {
  try {
    const { body: response } = await esClient.search(
      {
        index,
        size: 0,
        allow_no_indices: true,
        body: {
          terminate_after: 1,
        },
      },
      { meta: true }
    );
    return response._shards.total > 0;
  } catch (err) {
    if (err.body != null && err.body.status === 404) {
      return false;
    } else {
      throw err.body ? err.body : err;
    }
  }
};
