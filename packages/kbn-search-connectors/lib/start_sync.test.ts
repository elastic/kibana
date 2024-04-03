/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, CURRENT_CONNECTORS_JOB_INDEX } from '..';
import { SyncJobType, SyncStatus, TriggerMethod } from '../types/connectors';
import { CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX } from '..';

import { startConnectorSync } from './start_sync';

describe('startSync lib function', () => {
  const mockClient = {
    get: jest.fn(),
    index: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start a full sync', async () => {
    mockClient.get.mockImplementation(() => {
      return Promise.resolve({
        _id: 'connectorId',
        _source: {
          api_key_id: null,
          configuration: {},
          created_at: null,
          custom_scheduling: {},
          error: null,
          index_name: 'index_name',
          language: null,
          last_access_control_sync_error: null,
          last_access_control_sync_scheduled_at: null,
          last_access_control_sync_status: null,
          last_seen: null,
          last_sync_error: null,
          last_sync_scheduled_at: null,
          last_sync_status: null,
          last_synced: null,
          scheduling: { enabled: true, interval: '1 2 3 4 5' },
          service_type: null,
          status: 'not connected',
          sync_now: false,
        },
        index: CONNECTORS_INDEX,
      });
    });
    mockClient.index.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      startConnectorSync(mockClient as unknown as ElasticsearchClient, {
        connectorId: 'connectorId',
        jobType: SyncJobType.FULL,
      })
    ).resolves.toEqual({ _id: 'fakeId' });
    expect(mockClient.index).toHaveBeenCalledWith({
      document: {
        cancelation_requested_at: null,
        canceled_at: null,
        completed_at: null,
        connector: {
          configuration: {},
          filtering: null,
          id: 'connectorId',
          index_name: 'index_name',
          language: null,
          pipeline: null,
          service_type: null,
        },
        created_at: expect.any(String),
        deleted_document_count: 0,
        error: null,
        indexed_document_count: 0,
        indexed_document_volume: 0,
        job_type: SyncJobType.FULL,
        last_seen: null,
        metadata: {},
        started_at: null,
        status: SyncStatus.PENDING,
        total_document_count: null,
        trigger_method: TriggerMethod.ON_DEMAND,
        worker_hostname: null,
      },
      index: CURRENT_CONNECTORS_JOB_INDEX,
    });
  });

  it('should not create index if there is no connector', async () => {
    mockClient.get.mockImplementation(() => {
      return Promise.resolve({});
    });
    await expect(
      startConnectorSync(mockClient as unknown as ElasticsearchClient, {
        connectorId: 'connectorId',
        jobType: SyncJobType.FULL,
      })
    ).rejects.toEqual(new Error('resource_not_found'));
    expect(mockClient.index).not.toHaveBeenCalled();
  });

  it('should start an incremental sync', async () => {
    mockClient.get.mockImplementation(() => {
      return Promise.resolve({
        _id: 'connectorId',
        _source: {
          api_key_id: null,
          configuration: {},
          created_at: null,
          custom_scheduling: {},
          error: null,
          filtering: [],
          index_name: 'index_name',
          language: null,
          last_access_control_sync_status: null,
          last_seen: null,
          last_sync_error: null,
          last_sync_scheduled_at: null,
          last_sync_status: null,
          last_synced: null,
          scheduling: { enabled: true, interval: '1 2 3 4 5' },
          service_type: null,
          status: 'not connected',
          sync_now: false,
        },
        index: CONNECTORS_INDEX,
      });
    });
    mockClient.index.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      startConnectorSync(mockClient as unknown as ElasticsearchClient, {
        connectorId: 'connectorId',
        jobType: SyncJobType.INCREMENTAL,
      })
    ).resolves.toEqual({ _id: 'fakeId' });
    expect(mockClient.index).toHaveBeenCalledWith({
      document: {
        cancelation_requested_at: null,
        canceled_at: null,
        completed_at: null,
        connector: {
          configuration: {},
          filtering: null,
          id: 'connectorId',
          index_name: 'index_name',
          language: null,
          pipeline: null,
          service_type: null,
        },
        created_at: expect.any(String),
        deleted_document_count: 0,
        error: null,
        indexed_document_count: 0,
        indexed_document_volume: 0,
        job_type: SyncJobType.INCREMENTAL,
        last_seen: null,
        metadata: {},
        started_at: null,
        status: SyncStatus.PENDING,
        total_document_count: null,
        trigger_method: TriggerMethod.ON_DEMAND,
        worker_hostname: null,
      },
      index: CURRENT_CONNECTORS_JOB_INDEX,
    });
  });

  it('should start an access control sync', async () => {
    mockClient.get.mockImplementation(() => {
      return Promise.resolve({
        _id: 'connectorId',
        _source: {
          api_key_id: null,
          configuration: {},
          created_at: null,
          custom_scheduling: {},
          error: null,
          index_name: 'search-index_name',
          language: null,
          last_access_control_sync_status: null,
          last_seen: null,
          last_sync_error: null,
          last_sync_scheduled_at: null,
          last_sync_status: null,
          last_synced: null,
          scheduling: { enabled: true, interval: '1 2 3 4 5' },
          service_type: null,
          status: 'not connected',
          sync_now: false,
        },
        index: CONNECTORS_INDEX,
      });
    });
    mockClient.index.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      startConnectorSync(mockClient as unknown as ElasticsearchClient, {
        connectorId: 'connectorId',
        targetIndexName: '.search-acl-filter-index_name',
        jobType: SyncJobType.ACCESS_CONTROL,
      })
    ).resolves.toEqual({ _id: 'fakeId' });
    expect(mockClient.index).toHaveBeenCalledWith({
      document: {
        cancelation_requested_at: null,
        canceled_at: null,
        completed_at: null,
        connector: {
          configuration: {},
          filtering: null,
          id: 'connectorId',
          index_name: `${CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX}index_name`,
          language: null,
          pipeline: null,
          service_type: null,
        },
        created_at: expect.any(String),
        deleted_document_count: 0,
        error: null,
        indexed_document_count: 0,
        indexed_document_volume: 0,
        job_type: SyncJobType.ACCESS_CONTROL,
        last_seen: null,
        metadata: {},
        started_at: null,
        status: SyncStatus.PENDING,
        total_document_count: null,
        trigger_method: TriggerMethod.ON_DEMAND,
        worker_hostname: null,
      },
      index: CURRENT_CONNECTORS_JOB_INDEX,
    });
  });
});
