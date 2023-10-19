/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, CONNECTORS_JOBS_INDEX } from '..';
import { SyncStatus } from '../types/connectors';

import { cancelSyncs } from './cancel_syncs';

describe('cancelSync lib function', () => {
  const mockClient = {
    update: jest.fn(),
    updateByQuery: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const now = new Date('2022-05-22T10:10:11.111Z');
    jest.spyOn(Date, 'now').mockImplementation(() => now.getTime());
  });

  it('should call updateByQuery to cancel syncs', async () => {
    mockClient.updateByQuery.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      cancelSyncs(mockClient as unknown as ElasticsearchClient, 'connectorId')
    ).resolves.toEqual(undefined);
    expect(mockClient.updateByQuery).toHaveBeenCalledTimes(2);
    expect(mockClient.updateByQuery).toHaveBeenCalledWith({
      index: CONNECTORS_JOBS_INDEX,
      query: {
        bool: {
          must: [
            {
              term: {
                'connector.id': 'connectorId',
              },
            },
            {
              terms: {
                status: [SyncStatus.PENDING, SyncStatus.SUSPENDED],
              },
            },
          ],
        },
      },
      script: {
        lang: 'painless',
        source: `ctx._source['status'] = '${SyncStatus.CANCELED}';
ctx._source['cancelation_requested_at'] = '${new Date(Date.now()).toISOString()}';
ctx._source['canceled_at'] = '${new Date(Date.now()).toISOString()}';
ctx._source['completed_at'] = '${new Date(Date.now()).toISOString()}';`,
      },
    });
    expect(mockClient.updateByQuery).toHaveBeenCalledWith({
      index: CONNECTORS_JOBS_INDEX,
      query: {
        bool: {
          must: [
            {
              term: {
                'connector.id': 'connectorId',
              },
            },
            {
              terms: {
                status: [SyncStatus.IN_PROGRESS],
              },
            },
          ],
        },
      },
      script: {
        lang: 'painless',
        source: `ctx._source['status'] = '${SyncStatus.CANCELING}';
ctx._source['cancelation_requested_at'] = '${new Date(Date.now()).toISOString()}';`,
      },
    });
    await expect(mockClient.update).toHaveBeenCalledWith({
      doc: { last_sync_status: SyncStatus.CANCELED, sync_now: false },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
  });
});
