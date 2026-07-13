/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  WORKFLOWS_EXECUTIONS_DATA_STREAM,
  WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
} from './constants';
import { DataStreamExecutionsDataAccess } from './data_stream_executions_data_access';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../..';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '../../../../types/v1';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/step_executions_mappings';
import type {
  CreateExecutionsDataAccessDeps,
  ExecutionsDataAccessBundle,
  StepExecutionsDataAccess,
  WorkflowExecutionsDataAccess,
} from '../../types';

export class DataStreamExecutionsDataAccessBundle implements ExecutionsDataAccessBundle {
  constructor(private readonly deps: CreateExecutionsDataAccessDeps) {}

  async initSetup(): Promise<void> {
    this.deps.coreSetup.dataStreams.registerDataStream({
      name: WORKFLOWS_EXECUTIONS_DATA_STREAM,
      version: 1,
      hidden: true,
      template: {
        mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
      },
    });
    this.deps.coreSetup.dataStreams.registerDataStream({
      name: WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
      version: 1,
      hidden: true,
      template: {
        mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
      },
    });
  }

  async initStart(): Promise<void> {
    return Promise.resolve();
  }

  async createWorkflowExecutionsDataAccess(): Promise<WorkflowExecutionsDataAccess> {
    const esClient = await this.deps.coreSetup
      .getStartServices()
      .then(([coreStart]) => coreStart.elasticsearch.client.asInternalUser);

    return new DataStreamExecutionsDataAccess<EsWorkflowExecution>({
      esClient,
      logger: this.deps.logger,
      dataStreamName: WORKFLOWS_EXECUTIONS_DATA_STREAM,
    });
  }

  async createStepExecutionsDataAccess(): Promise<StepExecutionsDataAccess> {
    const esClient = await this.deps.coreSetup
      .getStartServices()
      .then(([coreStart]) => coreStart.elasticsearch.client.asInternalUser);

    return new DataStreamExecutionsDataAccess<EsWorkflowStepExecution>({
      esClient,
      logger: this.deps.logger,
      dataStreamName: WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
    });
  }
}
