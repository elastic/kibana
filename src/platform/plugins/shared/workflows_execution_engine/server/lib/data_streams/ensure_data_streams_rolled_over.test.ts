/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./roll_data_stream_if_required', () => ({
  rollDataStreamIfRequired: jest.fn(),
}));

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ensureWorkflowsDataStreamsRolledOver } from './ensure_data_streams_rolled_over';
import { rollDataStreamIfRequired } from './roll_data_stream_if_required';
import { WORKFLOWS_EXECUTION_LOGS_DATA_STREAM } from '../../repositories/logs_repository/constants';
import { WORKFLOWS_LOGS_MANAGED_INDEX_MAPPINGS_VERSION } from '../../repositories/logs_repository/data_stream';
import { WORKFLOWS_EVENTS_DATA_STREAM } from '../../trigger_events/event_logs/constants';
import { WORKFLOWS_EVENTS_MANAGED_INDEX_MAPPINGS_VERSION } from '../../trigger_events/event_logs/trigger_events_data_stream';

const mockRollDataStreamIfRequired = rollDataStreamIfRequired as jest.MockedFunction<
  typeof rollDataStreamIfRequired
>;

describe('ensureWorkflowsDataStreamsRolledOver', () => {
  const mockLogger = loggingSystemMock.createLogger();
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('attempts rollover for both streams when the first stream rollover throws', async () => {
    const boom = new Error('roll failed');
    mockRollDataStreamIfRequired.mockImplementation(async ({ dataStreamName }) => {
      if (dataStreamName === WORKFLOWS_EXECUTION_LOGS_DATA_STREAM) {
        throw boom;
      }
      return true;
    });

    await ensureWorkflowsDataStreamsRolledOver(mockLogger, mockEsClient);

    expect(mockRollDataStreamIfRequired).toHaveBeenCalledTimes(2);
    expect(mockRollDataStreamIfRequired.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        logger: mockLogger,
        esClient: mockEsClient,
        dataStreamName: WORKFLOWS_EXECUTION_LOGS_DATA_STREAM,
        targetManagedIndexMappingsVersion: WORKFLOWS_LOGS_MANAGED_INDEX_MAPPINGS_VERSION,
      })
    );
    expect(mockRollDataStreamIfRequired.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        logger: mockLogger,
        esClient: mockEsClient,
        dataStreamName: WORKFLOWS_EVENTS_DATA_STREAM,
        targetManagedIndexMappingsVersion: WORKFLOWS_EVENTS_MANAGED_INDEX_MAPPINGS_VERSION,
      })
    );

    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Error rolling over workflows data stream ${WORKFLOWS_EXECUTION_LOGS_DATA_STREAM}: roll failed`,
      { error: { stack_trace: boom.stack } }
    );
  });

  it('runs both stream checks when both succeed', async () => {
    mockRollDataStreamIfRequired.mockResolvedValue(false);

    await ensureWorkflowsDataStreamsRolledOver(mockLogger, mockEsClient);

    expect(mockRollDataStreamIfRequired).toHaveBeenCalledTimes(2);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
