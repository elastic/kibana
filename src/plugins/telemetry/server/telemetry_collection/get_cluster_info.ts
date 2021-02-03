/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ElasticsearchClient } from 'src/core/server';

// This can be removed when the ES client improves the types
export interface ESClusterInfo {
  cluster_uuid: string;
  cluster_name: string;
  version: {
    number: string;
    build_flavor?: string;
    build_type?: string;
    build_hash?: string;
    build_date?: string;
    build_snapshot?: boolean;
    lucene_version?: string;
    minimum_wire_compatibility_version?: string;
    minimum_index_compatibility_version?: string;
  };
}
/**
 * Get the cluster info from the connected cluster.
 *
 * This is the equivalent to GET /
 *
 * @param {function} esClient The asInternalUser handler (exposed for testing)
 */
export async function getClusterInfo(esClient: ElasticsearchClient) {
  const { body } = await esClient.info<ESClusterInfo>();
  return body;
}
