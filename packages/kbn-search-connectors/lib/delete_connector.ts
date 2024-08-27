/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AcknowledgedResponseBase } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { cancelSyncs } from './cancel_syncs';

export const deleteConnectorById = async (client: ElasticsearchClient, id: string) => {
  // timeout function to mitigate race condition with external connector running job and recreating index
  const timeout = async () => {
    const promise = new Promise((resolve) => setTimeout(resolve, 500));
    return promise;
  };
  await Promise.all([cancelSyncs(client, id), timeout]);
  return await client.transport.request<AcknowledgedResponseBase>({
    method: 'DELETE',
    path: `/_connector/${id}`,
  });
};
