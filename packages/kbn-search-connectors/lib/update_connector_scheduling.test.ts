/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '..';

import { updateConnectorScheduling } from './update_connector_scheduling';

describe('addConnector lib function', () => {
  const mockClient = {
    get: jest.fn(),
    index: jest.fn(),
    indices: {
      refresh: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update connector scheduling', async () => {
    mockClient.get.mockImplementationOnce(() => {
      return Promise.resolve({
        _source: {
          api_key_id: null,
          configuration: {},
          created_at: null,
          custom_scheduling: {},
          error: null,
          index_name: 'index_name',
          last_access_control_sync_error: null,
          last_access_control_sync_scheduled_at: null,
          last_access_control_sync_status: null,
          last_seen: null,
          last_sync_error: null,
          last_sync_scheduled_at: null,
          last_sync_status: null,
          last_synced: null,
          scheduling: {
            access_control: { enabled: false, interval: '* * * * *' },
            full: { enabled: false, interval: '* * * * *' },
            incremental: { enabled: false, interval: '* * * * *' },
          },
          service_type: null,
          status: 'not connected',
          sync_now: false,
        },
        index: CONNECTORS_INDEX,
      });
    });
    mockClient.index.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      updateConnectorScheduling(mockClient as unknown as ElasticsearchClient, 'connectorId', {
        access_control: { enabled: false, interval: '* * * * *' },
        full: {
          enabled: true,
          interval: '1 2 3 4 5',
        },
        incremental: { enabled: false, interval: '* * * * *' },
      })
    ).resolves.toEqual({ _id: 'fakeId' });
    expect(mockClient.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        configuration: {},
        created_at: null,
        custom_scheduling: {},
        error: null,
        index_name: 'index_name',
        last_access_control_sync_error: null,
        last_access_control_sync_scheduled_at: null,
        last_access_control_sync_status: null,
        last_seen: null,
        last_sync_error: null,
        last_sync_scheduled_at: null,
        last_sync_status: null,
        last_synced: null,
        scheduling: {
          access_control: { enabled: false, interval: '* * * * *' },
          full: { enabled: true, interval: '1 2 3 4 5' },
          incremental: { enabled: false, interval: '* * * * *' },
        },
        service_type: null,
        status: 'not connected',
        sync_now: false,
      },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.indices.refresh).toHaveBeenCalledWith({
      index: CONNECTORS_INDEX,
    });
  });

  it('should not index document if there is no connector', async () => {
    mockClient.get.mockImplementationOnce(() => {
      return Promise.resolve({});
    });
    await expect(
      updateConnectorScheduling(mockClient as unknown as ElasticsearchClient, 'connectorId', {
        access_control: { enabled: false, interval: '* * * * *' },
        full: {
          enabled: true,
          interval: '1 2 3 4 5',
        },
        incremental: { enabled: false, interval: '* * * * *' },
      })
    ).rejects.toEqual(new Error('Could not find document'));
    expect(mockClient.index).not.toHaveBeenCalled();
  });
});
