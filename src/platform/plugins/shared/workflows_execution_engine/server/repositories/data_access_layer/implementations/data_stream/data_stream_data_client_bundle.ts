/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import {
  WORKFLOWS_EXECUTIONS_DATA_STREAM,
  WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
} from './constants';
import { DataStreamExecutionsDataAccess } from './data_stream_executions_data_access';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/workflow_executions_mappings';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/step_executions_mappings';
import type {
  CreateDataClientDeps,
  DataClientBundle,
  DocumentVersionFields,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../../types';
import { DeferredDataClient } from '../deferred_data_client';

export class DataStreamDataClientBundle implements DataClientBundle {
  private esClientPromise!: Promise<ElasticsearchClient>;
  private started = false;

  constructor(private readonly deps: CreateDataClientDeps) {}

  async initSetup(coreSetup: CoreSetup): Promise<void> {
    coreSetup.dataStreams.registerDataStream({
      name: WORKFLOWS_EXECUTIONS_DATA_STREAM,
      version: 1,
      hidden: true,
      template: {
        mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
      },
    });
    coreSetup.dataStreams.registerDataStream({
      name: WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
      version: 1,
      hidden: true,
      template: {
        mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
      },
    });
  }

  async initStart(coreStart: CoreStart): Promise<void> {
    this.esClientPromise = Promise.all([
      coreStart.dataStreams.initializeClient(WORKFLOWS_EXECUTIONS_DATA_STREAM),
      coreStart.dataStreams.initializeClient(WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM),
    ]).then(() => coreStart.elasticsearch.client.asInternalUser);
    this.started = true;
  }

  async stop(): Promise<void> {}

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    if (!this.started) {
      throw new Error('initStart must be called before creating data clients');
    }
    return new DeferredDataClient(() =>
      this.esClientPromise.then(
        (esClient) =>
          new DataStreamExecutionsDataAccess<EsWorkflowExecution>({
            esClient,
            dataStreamName: WORKFLOWS_EXECUTIONS_DATA_STREAM,
            versionsCollector: new Map<string, Required<DocumentVersionFields>>(),
            additionalIndexesToQuery: ['.workflows-executions'],
            logger: this.deps.logger,
          })
      )
    );
  }

  createStepDataClient(): StepExecutionsDataClient {
    if (!this.started) {
      throw new Error('initStart must be called before creating data clients');
    }
    return new DeferredDataClient(() =>
      this.esClientPromise.then(
        (esClient) =>
          new DataStreamExecutionsDataAccess<EsWorkflowStepExecution>({
            esClient,
            dataStreamName: WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
            versionsCollector: new Map<string, Required<DocumentVersionFields>>(),
            additionalIndexesToQuery: ['.workflows-step-executions'],
            logger: this.deps.logger,
          })
      )
    );
  }
}
