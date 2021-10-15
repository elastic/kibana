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
    const { body } = await esClient.indices.getAlias({
      index: `${index}-*`,
      name: index,
    });
    return Object.keys(body).length > 0;
  } catch (err) {
    if (err.body != null && err.body.status === 404) {
      return false;
    } else {
      throw err.body ? err.body : err;
    }
  }
};
