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
import { DocumentVersionManager } from './document_version_manager';
import {
  DATASTREAM_WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  DATASTREAM_WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from './types';
import type {
  CreateDataClientDeps,
  DataClientBundle,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../../types';

export class DataStreamDataClientBundle implements DataClientBundle {
  private esClient!: ElasticsearchClient;

  constructor(private readonly deps: CreateDataClientDeps) {}

  async initSetup(coreSetup: CoreSetup): Promise<void> {
    coreSetup.dataStreams.registerDataStream({
      name: WORKFLOWS_EXECUTIONS_DATA_STREAM,
      version: 1,
      hidden: true,
      template: {
        mappings: DATASTREAM_WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
      },
    });
    coreSetup.dataStreams.registerDataStream({
      name: WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
      version: 1,
      hidden: true,
      template: {
        mappings: DATASTREAM_WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
      },
    });
  }

  async initStart(coreStart: CoreStart): Promise<void> {
    await Promise.all([
      coreStart.dataStreams.initializeClient(WORKFLOWS_EXECUTIONS_DATA_STREAM),
      coreStart.dataStreams.initializeClient(WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM),
    ]);

    this.esClient = coreStart.elasticsearch.client.asInternalUser;
  }

  async stop(): Promise<void> {}

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    return new DataStreamExecutionsDataAccess<EsWorkflowExecution>({
      esClient: this.esClient,
      dataStreamName: WORKFLOWS_EXECUTIONS_DATA_STREAM,
      versionManager: new DocumentVersionManager({
        esClient: this.esClient,
        dataStreamName: WORKFLOWS_EXECUTIONS_DATA_STREAM,
        logger: this.deps.logger,
      }),
      additionalIndexesToQuery: ['.workflows-executions'],
      logger: this.deps.logger,
      dateField: 'createdAt',
    });
  }

  createStepDataClient(): StepExecutionsDataClient {
    return new DataStreamExecutionsDataAccess<EsWorkflowStepExecution>({
      esClient: this.esClient,
      dataStreamName: WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
      versionManager: new DocumentVersionManager({
        esClient: this.esClient,
        dataStreamName: WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
        logger: this.deps.logger,
      }),
      additionalIndexesToQuery: ['.workflows-step-executions'],
      logger: this.deps.logger,
      dateField: 'startedAt',
    });
  }
}
