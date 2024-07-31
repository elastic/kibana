/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { ConnectorsAPISyncJobResponse } from '..';
import { ConnectorSyncJob, SyncStatus } from '../types/connectors';
import { Paginate } from '../types/pagination';

export const fetchSyncJobs = async (
  client: ElasticsearchClient,
  connectorId?: string,
  from: number = 0,
  size: number = 100,
  syncJobType: 'content' | 'access_control' | 'all' = 'all',
  syncStatus?: SyncStatus
): Promise<Paginate<ConnectorSyncJob>> => {
  const querystring = `from=${from}&size=${size}${
    connectorId ? '&connector_id=' + connectorId : ''
  }${syncJobType === 'content' ? '&job_type=full,incremental' : ''}${
    syncJobType === 'access_control' ? '&job_type=access_control' : ''
  }${syncStatus ? '&status=' + syncStatus : ''}`;
  const result = await client.transport.request<ConnectorsAPISyncJobResponse>({
    method: 'GET',
    path: `/_connector/_sync_job`,
    querystring,
  });

  return {
    _meta: {
      page: {
        from,
        has_more_hits_than_total: result.count > from + size,
        size,
        total: result.count,
      },
    },
    data: result.results,
  };
};
