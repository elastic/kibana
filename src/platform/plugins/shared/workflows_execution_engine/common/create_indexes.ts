/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createOrUpdateIndex } from './create_index';
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
  // Both indices use `createOrUpdateIndex` so additive mapping changes
  // (new fields like the HITL audit trio `respondedBy`/`respondedAt`/
  // `channel` for inbox multi-client safety) flow into existing
  // installations on plugin start without a manual reindex.
  // `putMapping` is additive — it won't try to change existing field
  // types — so re-running on every start is idempotent.
  await Promise.all([
    createOrUpdateIndex({
      esClient,
      indexName: WORKFLOWS_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
      logger,
    }),
    createOrUpdateIndex({
      esClient,
      indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
      logger,
    }),
  ]);
}
