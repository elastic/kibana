/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { asyncForEach } from '@kbn/std';

import { fetchSyncJobs, cancelSync } from '..';
import { SyncStatus } from '../types/connectors';

export const cancelSyncs = async (
  client: ElasticsearchClient,
  connectorId: string
): Promise<void> => {
  await asyncForEach(
    [SyncStatus.PENDING, SyncStatus.IN_PROGRESS, SyncStatus.SUSPENDED],
    async (status) => {
      const syncJobsToCancel = await fetchSyncJobs(client, connectorId, 0, 1000, 'all', status);
      await asyncForEach(syncJobsToCancel.data, async (syncJob) => {
        await cancelSync(client, syncJob.id);
      });
    }
  );

  return await client.transport.request({
    method: 'PUT',
    path: `/_connector/${connectorId}/_last_sync`,
    body: {
      last_access_control_sync_status: SyncStatus.CANCELED,
      last_sync_status: SyncStatus.CANCELED,
    },
  });
};
