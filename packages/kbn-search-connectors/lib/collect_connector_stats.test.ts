/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConnectorSyncJob, Paginate } from '../types';
import { fetchConnectors, fetchSyncJobs } from '..';
import { collectConnectorStats } from './collect_connector_stats';
import {
  expectedDeletedConnectorStats,
  expectedMysqlConnectorStats,
  expectedSpoConnectorStats,
  mysqlConnector,
  mysqlFullSyncJob,
  orphanedSyncJob,
  spoAccessControlSyncJob,
  spoConnector,
  spoFullSyncJob,
  spoIncrementalSyncJob,
} from './collect_connector_stats_test_data';

jest.mock('.', () => ({
  fetchConnectors: jest.fn(),
  fetchSyncJobs: jest.fn(),
}));

describe('collect connector stats', () => {
  const mockClient = {
    indices: {
      stats: jest.fn(),
    },
    search: jest.fn(),
  };
  const mockSyncJobsResponse: Paginate<ConnectorSyncJob> = {
    _meta: {
      page: {
        from: 0,
        size: 5,
        total: 5,
        has_more_hits_than_total: false,
      },
    },
    data: [
      spoFullSyncJob,
      spoIncrementalSyncJob,
      spoAccessControlSyncJob,
      mysqlFullSyncJob,
      orphanedSyncJob,
    ],
  };
  it('should collect connector stats', async () => {
    (fetchConnectors as jest.Mock).mockImplementation(() => [spoConnector, mysqlConnector]);
    (fetchSyncJobs as jest.Mock).mockImplementation(() => mockSyncJobsResponse);
    mockClient.indices.stats.mockImplementation((params: { index: any }) =>
      Promise.resolve({
        _all: {
          primaries: {
            docs: {
              count: params.index === spoConnector.index_name ? 1000 : 2000,
            },
            store: {
              size_in_bytes: params.index === spoConnector.index_name ? 10000 : 20000,
            },
          },
        },
      })
    );
    mockClient.search.mockImplementation(() =>
      Promise.resolve({
        aggregations: {
          table_count: {
            value: 7,
          },
        },
      })
    );

    const collectedConnectorStats = await collectConnectorStats(mockClient as any);

    expect(collectedConnectorStats.sort((a, b) => (a.id > b.id ? 1 : -1))).toEqual([
      expectedSpoConnectorStats,
      expectedMysqlConnectorStats,
      expectedDeletedConnectorStats,
    ]);
  });
});
