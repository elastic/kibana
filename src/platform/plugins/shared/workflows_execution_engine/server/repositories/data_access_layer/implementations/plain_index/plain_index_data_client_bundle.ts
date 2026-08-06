/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { createOrUpdateIndex } from './helpers';
import { PlainIndexDataClient } from './plain_index_data_client';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../constants/execution_indexes';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/step_executions_mappings';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/workflow_executions_mappings';
import type {
  CreateDataClientDeps,
  DataClientBundle,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../../types';
import { DeferredDataClient } from '../deferred_data_client';

export class PlainIndexDataClientBundle implements DataClientBundle {
  private initPromise!: Promise<ElasticsearchClient>;
  private started: boolean = false;

  constructor(private readonly deps: CreateDataClientDeps) {}

  async initSetup(_coreSetup: CoreSetup): Promise<void> {}

  async initStart(coreStart: CoreStart): Promise<void> {
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const { logger } = this.deps;

    this.initPromise = this.init(esClient, logger);
    this.started = true;
  }

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    if (!this.started) {
      throw new Error('initStart must be called before creating data clients');
    }
    return new DeferredDataClient(() =>
      this.initPromise.then(
        (esClient) =>
          new PlainIndexDataClient<EsWorkflowExecution>({
            esClient,
            logger: this.deps.logger,
            indexName: WORKFLOWS_EXECUTIONS_INDEX,
            mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
          })
      )
    );
  }

  createStepDataClient(): StepExecutionsDataClient {
    if (!this.started) {
      throw new Error('initStart must be called before creating data clients');
    }

    return new DeferredDataClient(() =>
      this.initPromise.then(
        (esClient) =>
          new PlainIndexDataClient<EsWorkflowStepExecution>({
            esClient,
            logger: this.deps.logger,
            indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
            mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
          })
      )
    );
  }

  private async init(esClient: ElasticsearchClient, logger: Logger): Promise<ElasticsearchClient> {
    const initAttempts = 10;
    for (let attempt = 1; attempt <= initAttempts; attempt++) {
      try {
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
        return esClient;
      } catch (error) {
        logger.error('Failed to create or update index', { error });
        // Wait for a short delay before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Failed to initialize data client bundle after multiple attempts');
  }
}
