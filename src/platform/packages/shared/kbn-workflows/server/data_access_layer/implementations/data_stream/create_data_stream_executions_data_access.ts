/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOWS_EXECUTIONS_DS, WORKFLOWS_STEP_EXECUTIONS_DS } from './constants';
import { DataStreamExecutionsDataAccess } from './data_stream_executions_data_access';
import {
  initializeStepExecutionsClient,
  initializeStepExecutionsDataStream,
} from './step_executions_data_stream';
import type { StepExecutionsDataStreamClient } from './step_executions_data_stream';
import {
  initializeWorkflowExecutionsClient,
  initializeWorkflowExecutionsDataStream,
} from './workflow_executions_data_stream';
import type { WorkflowExecutionsDataStreamClient } from './workflow_executions_data_stream';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '../../../../types/v1';
import type {
  CreateExecutionsDataAccessDeps,
  ExecutionsDataAccessBundle,
  StepExecutionsDataAccess,
  WorkflowExecutionsDataAccess,
} from '../../types';

export class DataStreamExecutionsDataAccessBundle implements ExecutionsDataAccessBundle {
  private workflowsExecutionsDataStreamClient!: WorkflowExecutionsDataStreamClient;
  private stepExecutionsDataStreamClient!: StepExecutionsDataStreamClient;

  constructor(private readonly deps: CreateExecutionsDataAccessDeps) {}

  async initSetup(): Promise<void> {
    initializeStepExecutionsDataStream(this.deps.coreSetup.dataStreams);
    initializeWorkflowExecutionsDataStream(this.deps.coreSetup.dataStreams);
  }

  async initStart(): Promise<void> {
    const coreStart = await this.deps.coreSetup.getStartServices().then(([core]) => core);
    this.workflowsExecutionsDataStreamClient = await initializeWorkflowExecutionsClient(
      coreStart.dataStreams
    );
    this.stepExecutionsDataStreamClient = await initializeStepExecutionsClient(
      coreStart.dataStreams
    );
  }

  async createWorkflowExecutionsDataAccess(): Promise<WorkflowExecutionsDataAccess> {
    const esClient = await this.deps.coreSetup
      .getStartServices()
      .then(([coreStart]) => coreStart.elasticsearch.client.asInternalUser);

    return new DataStreamExecutionsDataAccess<EsWorkflowExecution>({
      esClient,
      logger: this.deps.logger,
      dataStreamName: WORKFLOWS_EXECUTIONS_DS,
      dataStreamClient: this.workflowsExecutionsDataStreamClient,
    });
  }

  async createStepExecutionsDataAccess(): Promise<StepExecutionsDataAccess> {
    const esClient = await this.deps.coreSetup
      .getStartServices()
      .then(([coreStart]) => coreStart.elasticsearch.client.asInternalUser);

    return new DataStreamExecutionsDataAccess<EsWorkflowStepExecution>({
      esClient,
      logger: this.deps.logger,
      dataStreamName: WORKFLOWS_STEP_EXECUTIONS_DS,
      dataStreamClient: this.stepExecutionsDataStreamClient,
    });
  }
}
