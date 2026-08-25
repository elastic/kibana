/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
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

export class PlainIndexDataClientBundle implements DataClientBundle {
  private esClient!: ElasticsearchClient;
  private stopped = false;

  constructor(private readonly deps: CreateDataClientDeps) {}

  async initSetup(_coreSetup: CoreSetup): Promise<void> {}

  async initStart(coreStart: CoreStart): Promise<void> {
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const { logger } = this.deps;
    this.esClient = await this.init(esClient, logger);
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    return new PlainIndexDataClient<EsWorkflowExecution>({
      esClient: this.esClient,
      logger: this.deps.logger,
      indexName: WORKFLOWS_EXECUTIONS_INDEX,
    });
  }

  createStepDataClient(): StepExecutionsDataClient {
    return new PlainIndexDataClient<EsWorkflowStepExecution>({
      esClient: this.esClient,
      logger: this.deps.logger,
      indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });
  }

  private async init(esClient: ElasticsearchClient, logger: Logger): Promise<ElasticsearchClient> {
    let attempt = 0;

    while (!this.stopped) {
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
        if (!isRetryableEsClientError(error)) {
          throw error;
        }
        attempt++;
        const ms = Math.min(1000 * Math.pow(2, attempt), 30_000);
        logger.warn(`Transient error during index init, retrying in ${ms}ms`, { error });
        await new Promise((resolve) => setTimeout(resolve, ms));
      }
    }
    throw new Error('Index initialization aborted: plugin stopped');
  }
}
