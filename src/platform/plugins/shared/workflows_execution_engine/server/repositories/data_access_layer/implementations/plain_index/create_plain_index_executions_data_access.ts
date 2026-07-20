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
import { PlainIndexExecutionsDataAccess } from './plain_index_executions_data_access';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../constants/execution_indexes';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/step_executions_mappings';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/workflow_executions_mappings';
import type {
  CreateExecutionsDataAccessDeps,
  ExecutionsDataAccessBundle,
  StepExecutionsDataAccess,
  WorkflowExecutionsDataAccess,
} from '../../types';

export class PlainIndexExecutionsDataAccessBundle implements ExecutionsDataAccessBundle {
  constructor(private readonly deps: CreateExecutionsDataAccessDeps) {}

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

  async createWorkflowExecutionsDataAccess(): Promise<WorkflowExecutionsDataAccess> {
    const esClient = await this.deps.coreSetup
      .getStartServices()
      .then(([coreStart]) => coreStart.elasticsearch.client.asInternalUser);
    return new PlainIndexExecutionsDataAccess<EsWorkflowExecution>({
      esClient,
      logger: this.deps.logger,
      indexName: WORKFLOWS_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
    });
  }

  async createStepExecutionsDataAccess(): Promise<StepExecutionsDataAccess> {
    const esClient = await this.deps.coreSetup
      .getStartServices()
      .then(([coreStart]) => coreStart.elasticsearch.client.asInternalUser);
    return new PlainIndexExecutionsDataAccess<EsWorkflowStepExecution>({
      esClient,
      logger: this.deps.logger,
      indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
    });
  }
}
