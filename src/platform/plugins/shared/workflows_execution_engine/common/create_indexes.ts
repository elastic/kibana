/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createIndexWithMappings, createOrUpdateIndex } from './create_index';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from './mappings';

interface CreateIndexesOptions {
  esClient: ElasticsearchClient;
  logger?: Logger;
}

export async function createIndexes(options: CreateIndexesOptions): Promise<void> {
  const { esClient, logger } = options;
  await Promise.all([
    createOrUpdateIndex({
      esClient,
      indexName: WORKFLOWS_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
      logger,
    }),
    createIndexWithMappings({
      esClient,
      indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
      logger,
    }),
  ]);
}
