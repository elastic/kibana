/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { SyncJobType } from '../types/connectors';

export const startConnectorSync = async (
  client: ElasticsearchClient,
  {
    connectorId,
    jobType,
  }: {
    connectorId: string;
    jobType?: SyncJobType;
  }
) => {
  return await client.transport.request<{ id: string }>({
    method: 'POST',
    path: `/_connector/_sync_job`,
    body: {
      id: connectorId,
      job_type: jobType,
    },
  });
};
