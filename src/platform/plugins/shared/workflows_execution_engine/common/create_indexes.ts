/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { setupRolloverIndex } from './create_index';
import {
  WORKFLOWS_STEP_EXECUTIONS_ILM_POLICY,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_PATTERN,
  WORKFLOWS_STEP_EXECUTIONS_INITIAL_INDEX,
} from './step_executions_index';
import {
  WORKFLOWS_EXECUTIONS_ILM_POLICY,
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_EXECUTIONS_INDEX_PATTERN,
  WORKFLOWS_EXECUTIONS_INITIAL_INDEX,
} from './workflow_executions_index';

interface CreateIndexesOptions {
  esClient: ElasticsearchClient;
  rolloverMaxAge: string;
  logger?: Logger;
}

export async function createIndexes(options: CreateIndexesOptions): Promise<void> {
  const { esClient, rolloverMaxAge, logger } = options;
  await Promise.all([
    setupRolloverIndex({
      esClient,
      aliasName: WORKFLOWS_EXECUTIONS_INDEX,
      indexPattern: WORKFLOWS_EXECUTIONS_INDEX_PATTERN,
      initialIndex: WORKFLOWS_EXECUTIONS_INITIAL_INDEX,
      ilmPolicyName: WORKFLOWS_EXECUTIONS_ILM_POLICY,
      mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
      rolloverMaxAge,
      logger,
    }),
    setupRolloverIndex({
      esClient,
      aliasName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      indexPattern: WORKFLOWS_STEP_EXECUTIONS_INDEX_PATTERN,
      initialIndex: WORKFLOWS_STEP_EXECUTIONS_INITIAL_INDEX,
      ilmPolicyName: WORKFLOWS_STEP_EXECUTIONS_ILM_POLICY,
      mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
      rolloverMaxAge,
      logger,
    }),
  ]);
}
