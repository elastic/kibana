/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '@kbn/workflows';
import {
  ensureExecutionDataStreamsReady,
  resetEnsureExecutionDataStreamsReadyForTests,
} from './ensure_execution_data_streams_ready';

jest.mock('../../repositories/workflow_executions_data_stream', () => ({
  initializeWorkflowExecutionsClient: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../repositories/step_executions_data_stream', () => ({
  initializeStepExecutionsClient: jest.fn().mockResolvedValue({}),
}));

const { initializeWorkflowExecutionsClient } = jest.requireMock(
  '../../repositories/workflow_executions_data_stream'
);
const { initializeStepExecutionsClient } = jest.requireMock(
  '../../repositories/step_executions_data_stream'
);

describe('ensureExecutionDataStreamsReady', () => {
  beforeEach(() => {
    resetEnsureExecutionDataStreamsReadyForTests();
    jest.clearAllMocks();
  });

  it('initializes clients and creates missing data streams', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getDataStream.mockRejectedValue(
      new EsErrors.ResponseError({
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception' } },
      } as any)
    );
    esClient.indices.createDataStream.mockResolvedValue({ acknowledged: true });

    const dataStreams = {
      initializeClient: jest.fn(),
    };

    await ensureExecutionDataStreamsReady(dataStreams as any, esClient);

    expect(initializeWorkflowExecutionsClient).toHaveBeenCalledWith(dataStreams);
    expect(initializeStepExecutionsClient).toHaveBeenCalledWith(dataStreams);
    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
      name: WORKFLOWS_EXECUTIONS_INDEX,
    });
    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
      name: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });
  });

  it('deduplicates concurrent initialization', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [] });

    const dataStreams = {
      initializeClient: jest.fn(),
    };

    await Promise.all([
      ensureExecutionDataStreamsReady(dataStreams as any, esClient),
      ensureExecutionDataStreamsReady(dataStreams as any, esClient),
    ]);

    expect(initializeWorkflowExecutionsClient).toHaveBeenCalledTimes(1);
    expect(initializeStepExecutionsClient).toHaveBeenCalledTimes(1);
  });
});
