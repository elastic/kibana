/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import { WORKFLOWS_EXECUTIONS_IO_DATA_STREAM } from './constants';
import { ExecutionsIoDataClient } from './executions_io_data_client';
import { registerExecutionsIoDataStream } from './executions_io_data_stream';
import { DataStreamMetadataManager } from '../data_stream/data_stream_metadata_manager';

/**
 * Registers and starts the IO data stream for whichever execution bundle is active.
 * Legacy `input` / `output` reads fall back to the plain execution indexes inside
 * {@link ExecutionsIoDataClient}.
 */
export class ExecutionsIoLifecycle {
  private esClient: ElasticsearchClient | undefined;
  private metadataManager: DataStreamMetadataManager | undefined;

  register(coreSetup: CoreSetup, dataRetention: string): void {
    registerExecutionsIoDataStream(coreSetup, dataRetention);
  }

  async init(coreStart: CoreStart, esClient: ElasticsearchClient, logger: Logger): Promise<void> {
    await coreStart.dataStreams.initializeClient(WORKFLOWS_EXECUTIONS_IO_DATA_STREAM);
    this.esClient = esClient;
    this.metadataManager = new DataStreamMetadataManager({
      esClient,
      dataStreamName: WORKFLOWS_EXECUTIONS_IO_DATA_STREAM,
      logger,
    });
    await this.metadataManager.init();
  }

  stop(): void {
    this.metadataManager?.dispose();
  }

  createClient(logger: Logger): ExecutionsIoDataClient {
    if (!this.esClient || !this.metadataManager) {
      throw new Error('Executions IO data stream is not started');
    }

    return new ExecutionsIoDataClient({
      esClient: this.esClient,
      metadataManager: this.metadataManager,
      logger,
    });
  }
}
