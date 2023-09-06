/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fetchSyncJobsByConnectorId } from './fetch_sync_jobs';

describe('fetchSyncJobs lib', () => {
  const mockClient = {
    get: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetch sync jobs by connector id', () => {
    it('should fetch sync jobs by connector id', async () => {
      mockClient.search.mockImplementationOnce(() =>
        Promise.resolve({ hits: { hits: ['result1', 'result2'] }, total: 2 })
      );
      await expect(fetchSyncJobsByConnectorId(mockClient as any, 'id', 0, 10)).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 10,
            total: 0,
          },
        },
        data: [],
      });
      expect(mockClient.search).toHaveBeenCalledWith({
        from: 0,
        index: '.elastic-connectors-sync-jobs',
        query: {
          term: {
            'connector.id': 'id',
          },
        },
        size: 10,
        sort: {
          created_at: {
            order: 'desc',
          },
        },
      });
    });
    it('should return empty result if size is 0', async () => {
      await expect(fetchSyncJobsByConnectorId(mockClient as any, 'id', 0, 0)).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 10,
            total: 0,
          },
        },
        data: [],
      });
      expect(mockClient.search).not.toHaveBeenCalled();
    });
    it('should return empty array on index not found error', async () => {
      mockClient.search.mockImplementationOnce(() =>
        Promise.reject({
          meta: {
            body: {
              error: {
                type: 'index_not_found_exception',
              },
            },
          },
        })
      );
      await expect(fetchSyncJobsByConnectorId(mockClient as any, 'id', 0, 10)).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 10,
            total: 0,
          },
        },
        data: [],
      });
      expect(mockClient.search).toHaveBeenCalledWith({
        from: 0,
        index: '.elastic-connectors-sync-jobs',
        query: {
          term: {
            'connector.id': 'id',
          },
        },
        size: 10,
        sort: {
          created_at: {
            order: 'desc',
          },
        },
      });
    });
    it('should throw on other errors', async () => {
      mockClient.search.mockImplementationOnce(() =>
        Promise.reject({
          meta: {
            body: {
              error: {
                type: 'other error',
              },
            },
          },
        })
      );
      await expect(fetchSyncJobsByConnectorId(mockClient as any, 'id', 0, 10)).rejects.toEqual({
        meta: {
          body: {
            error: {
              type: 'other error',
            },
          },
        },
      });
      expect(mockClient.search).toHaveBeenCalledWith({
        from: 0,
        index: '.elastic-connectors-sync-jobs',
        query: {
          term: {
            'connector.id': 'id',
          },
        },
        size: 10,
        sort: {
          created_at: {
            order: 'desc',
          },
        },
      });
    });
  });
});
