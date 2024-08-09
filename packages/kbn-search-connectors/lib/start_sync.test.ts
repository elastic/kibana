/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { errors } from '@elastic/elasticsearch';

import { SyncJobType } from '../types/connectors';

import { startConnectorSync } from './start_sync';

describe('startSync lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start a full sync', async () => {
    mockClient.transport.request.mockImplementation(() => ({ id: '12345' }));

    await expect(
      startConnectorSync(mockClient as unknown as ElasticsearchClient, {
        connectorId: 'connectorId',
        jobType: SyncJobType.FULL,
      })
    ).resolves.toEqual({ id: '12345' });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_connector/_sync_job',
      body: {
        id: 'connectorId',
        job_type: 'full',
      },
    });
  });

  it('should start an incremental sync', async () => {
    mockClient.transport.request.mockImplementation(() => ({ id: '12345' }));

    await expect(
      startConnectorSync(mockClient as unknown as ElasticsearchClient, {
        connectorId: 'connectorId',
        jobType: SyncJobType.INCREMENTAL,
      })
    ).resolves.toEqual({ id: '12345' });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_connector/_sync_job',
      body: {
        id: 'connectorId',
        job_type: 'incremental',
      },
    });
  });

  it('should start an access_control sync', async () => {
    mockClient.transport.request.mockImplementation(() => ({ id: '12345' }));

    await expect(
      startConnectorSync(mockClient as unknown as ElasticsearchClient, {
        connectorId: 'connectorId',
        jobType: SyncJobType.ACCESS_CONTROL,
      })
    ).resolves.toEqual({ id: '12345' });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_connector/_sync_job',
      body: {
        id: 'connectorId',
        job_type: 'access_control',
      },
    });
  });

  it('sync not started if there is no connector', async () => {
    const notFoundError = new errors.ResponseError({
      statusCode: 404,
      body: {
        error: {
          type: `document_missing_exception`,
        },
      },
    } as any);

    mockClient.transport.request.mockRejectedValueOnce(notFoundError);

    await expect(
      startConnectorSync(mockClient as unknown as ElasticsearchClient, {
        connectorId: 'connectorId',
        jobType: SyncJobType.FULL,
      })
    ).rejects.toEqual(notFoundError);
  });
});
