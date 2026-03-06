/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { WorkflowExecutionRepository } from '.';
import { initializeDataStreamClient } from './data_stream';

export async function createWorkflowExecutionRepository(
  coreDataStreams: DataStreamsStart,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<WorkflowExecutionRepository> {
  const dataStream = await initializeDataStreamClient(coreDataStreams);
  return new WorkflowExecutionRepository(dataStream, esClient, logger);
}
