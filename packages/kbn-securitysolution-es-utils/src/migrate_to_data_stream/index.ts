/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../elasticsearch_client';

/**
 * migrate to data stream
 * @param esClient
 * @param name
 */
export const migrateToDataStream = async (
  esClient: ElasticsearchClient,
  name: string
): Promise<unknown> => {
  return esClient.indices.migrateToDataStream({
    name,
  });
};
