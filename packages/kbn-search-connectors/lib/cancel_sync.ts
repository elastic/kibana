/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ConnectorAPICancelSyncResponse } from '../types';

export const cancelSync = async (client: ElasticsearchClient, syncJobId: string) => {
  const result = await client.transport.request<ConnectorAPICancelSyncResponse>({
    method: 'PUT',
    path: `/_connector/_sync_job/${syncJobId}/_cancel`,
  });
  return result;
};
