/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../elasticsearch_client';

/**
 * This function is similar to getIndexExists, but is limited to searching indices that match
 * the index pattern used as concrete backing indices (e.g. .siem-signals-default-000001).
 * This allows us to separate the indices that are actually .siem-signals indices from
 * alerts as data indices that only share the .siem-signals alias.
 *
 * @param esClient Elasticsearch client to use to make the request
 * @param index Index alias name to check for existence
 */
export const getBootstrapIndexExists = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<boolean> => {
  try {
    const body = await esClient.indices.getAlias({
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
