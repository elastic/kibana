/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createIndexWithMappings } from './create_index';
import {
  WORKFLOWS_EXECUTION_STATE_INDEX,
  WORKFLOWS_EXECUTION_STATE_INDEX_MAPPINGS,
} from './mappings';

interface CreateIndexesOptions {
  esClient: ElasticsearchClient;
  logger?: Logger;
}

export async function createIndexes(options: CreateIndexesOptions): Promise<void> {
  const { esClient, logger } = options;
  await createIndexWithMappings({
    esClient,
    indexName: WORKFLOWS_EXECUTION_STATE_INDEX,
    mappings: WORKFLOWS_EXECUTION_STATE_INDEX_MAPPINGS,
    logger,
  });
}
