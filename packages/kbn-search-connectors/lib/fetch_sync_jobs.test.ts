/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SyncStatus } from '../types';
import { fetchSyncJobs } from './fetch_sync_jobs';

describe('fetchSyncJobs lib', () => {
  const mockClient = {
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetch sync jobs', () => {
    it('should fetch sync jobs', async () => {
      mockClient.transport.request.mockImplementationOnce(() => ({
        count: 22,
        results: [],
      }));
      await expect(fetchSyncJobs(mockClient as any, 'id', 0, 10, 'content')).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: true,
            size: 10,
            total: 22,
          },
        },
        data: [],
      });
      expect(mockClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_connector/_sync_job',
        querystring: 'from=0&size=10&connector_id=id&job_type=full,incremental',
      });
    });

    it('should fetch sync jobs by status', async () => {
      mockClient.transport.request.mockImplementationOnce(() => ({
        count: 22,
        results: [],
      }));
      await expect(
        fetchSyncJobs(mockClient as any, 'id', 0, 10, 'content', SyncStatus.IN_PROGRESS)
      ).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: true,
            size: 10,
            total: 22,
          },
        },
        data: [],
      });
      expect(mockClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_connector/_sync_job',
        querystring: 'from=0&size=10&connector_id=id&job_type=full,incremental&status=in_progress',
      });
    });
  });
});
