/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

/**
 * Get the cluster info from the connected cluster.
 *
 * This is the equivalent to GET /
 *
 * @param {function} esClient The asInternalUser handler (exposed for testing)
 */
export async function getClusterInfo(esClient: ElasticsearchClient) {
  return await esClient.info();
}
