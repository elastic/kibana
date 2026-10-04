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
  STEP_EXECUTIONS_DATA_STREAM_DEFINITION,
  WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION,
} from './data-stream-definitions';
import { DataStreamDataClient } from './data_stream_data_client';
import { DataStreamMetadataManager } from './data_stream_metadata_manager';
import { DocumentVersionManager } from './document_version_manager';
import { createRetryingEsClient } from '../../../../lib/create_retrying_es_client';
import type {
  CreateDataClientDeps,
  DataClientBundle,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../../types';

export class DataStreamDataClientBundle implements DataClientBundle {
  private esClient!: ElasticsearchClient;
  private workflowMetadataManager!: DataStreamMetadataManager;
  private stepMetadataManager!: DataStreamMetadataManager;

  constructor(private readonly deps: CreateDataClientDeps) {}

  async initSetup(coreSetup: CoreSetup): Promise<void> {
    coreSetup.dataStreams.registerDataStream({
      name: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION.name,
      version: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION.version,
      hidden: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION.hidden,
      template: {
        mappings: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION.mappings,
        settings: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION.settings,
        lifecycle: { data_retention: this.deps.dataRetention },
      },
    });
    coreSetup.dataStreams.registerDataStream({
      name: STEP_EXECUTIONS_DATA_STREAM_DEFINITION.name,
      version: STEP_EXECUTIONS_DATA_STREAM_DEFINITION.version,
      hidden: STEP_EXECUTIONS_DATA_STREAM_DEFINITION.hidden,
      template: {
        mappings: STEP_EXECUTIONS_DATA_STREAM_DEFINITION.mappings,
        settings: STEP_EXECUTIONS_DATA_STREAM_DEFINITION.settings,
        lifecycle: { data_retention: this.deps.dataRetention },
      },
    });
  }

  async initStart(coreStart: CoreStart): Promise<void> {
    await Promise.all([
      coreStart.dataStreams.initializeClient(WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION.name),
      coreStart.dataStreams.initializeClient(STEP_EXECUTIONS_DATA_STREAM_DEFINITION.name),
    ]);

    this.esClient = createRetryingEsClient(
      coreStart.elasticsearch.client.asInternalUser,
      this.deps.logger
    );

    this.workflowMetadataManager = new DataStreamMetadataManager({
      esClient: this.esClient,
      dataStreamName: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION.name,
      logger: this.deps.logger,
    });
    this.stepMetadataManager = new DataStreamMetadataManager({
      esClient: this.esClient,
      dataStreamName: STEP_EXECUTIONS_DATA_STREAM_DEFINITION.name,
      logger: this.deps.logger,
    });

    await Promise.all([this.workflowMetadataManager.init(), this.stepMetadataManager.init()]);
  }

  async stop(): Promise<void> {
    this.workflowMetadataManager.dispose();
    this.stepMetadataManager.dispose();
  }

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    return new DataStreamDataClient<EsWorkflowExecution>({
      esClient: this.esClient,
      dataStreamName: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION.name,
      versionManager: new DocumentVersionManager({
        esClient: this.esClient,
        dataStreamName: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION.name,
        metadataManager: this.workflowMetadataManager,
      }),
      metadataManager: this.workflowMetadataManager,
      additionalIndexesToQuery: ['.workflows-executions'],
      logger: this.deps.logger,
      dateField: 'createdAt',
    });
  }

  createStepDataClient(): StepExecutionsDataClient {
    return new DataStreamDataClient<EsWorkflowStepExecution>({
      esClient: this.esClient,
      dataStreamName: STEP_EXECUTIONS_DATA_STREAM_DEFINITION.name,
      versionManager: new DocumentVersionManager({
        esClient: this.esClient,
        dataStreamName: STEP_EXECUTIONS_DATA_STREAM_DEFINITION.name,
        metadataManager: this.stepMetadataManager,
      }),
      metadataManager: this.stepMetadataManager,
      additionalIndexesToQuery: ['.workflows-step-executions'],
      logger: this.deps.logger,
      dateField: 'startedAt',
    });
  }
}
