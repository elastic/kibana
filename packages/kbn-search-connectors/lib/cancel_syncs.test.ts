/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { SyncStatus } from '../types/connectors';

import { cancelSyncs } from './cancel_syncs';
import { fetchSyncJobs } from './fetch_sync_jobs';

jest.mock('./fetch_sync_jobs', () => ({
  fetchSyncJobs: jest.fn(),
}));

describe('cancelSync lib function', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call /_cancel endpoint to cancel syncs', async () => {
    (fetchSyncJobs as jest.Mock)
      .mockResolvedValueOnce({
        data: [{ id: 'job_1' }, { id: 'job_2' }],
      })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [{ id: 'job_3' }] });

    await expect(
      cancelSyncs(mockClient as unknown as ElasticsearchClient, 'connectorId')
    ).resolves.toEqual(undefined);
    expect(fetchSyncJobs).toHaveBeenCalledTimes(3);
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_connector/_sync_job/job_1/_cancel',
    });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_connector/_sync_job/job_2/_cancel',
    });
    expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_connector/_sync_job/job_3/_cancel',
    });
    await expect(mockClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_connector/connectorId/_last_sync',
      body: {
        last_access_control_sync_status: SyncStatus.CANCELED,
        last_sync_status: SyncStatus.CANCELED,
      },
    });
  });
});
