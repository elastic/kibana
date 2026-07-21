/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  constructor(private readonly deps: CreateDataClientDeps) {}

  async initSetup(): Promise<void> {
    const esClient = await this.deps.coreSetup
      .getStartServices()
      .then(([coreStart]) => coreStart.elasticsearch.client.asInternalUser);
    const logger = this.deps.logger;
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
    } catch (error) {
      this.deps.logger.error('Failed to create or update index', { error });
      throw error;
    }
  }

  initStart(): Promise<void> {
    return Promise.resolve();
  }

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    return new DeferredDataClient<EsWorkflowExecution>(() =>
      this.deps.coreSetup.getStartServices().then(
        ([coreStart]) =>
          new PlainIndexDataClient<EsWorkflowExecution>({
            esClient: coreStart.elasticsearch.client.asInternalUser,
            logger: this.deps.logger,
            indexName: WORKFLOWS_EXECUTIONS_INDEX,
            mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
          })
      )
    );
  }

  createStepDataClient(): StepExecutionsDataClient {
    return new DeferredDataClient<EsWorkflowStepExecution>(() =>
      this.deps.coreSetup.getStartServices().then(
        ([coreStart]) =>
          new PlainIndexDataClient<EsWorkflowStepExecution>({
            esClient: coreStart.elasticsearch.client.asInternalUser,
            logger: this.deps.logger,
            indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
            mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
          })
      )
    );
  }
}
