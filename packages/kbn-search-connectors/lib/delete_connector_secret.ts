/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ConnectorsAPIUpdateResponse } from '../types/connectors_api';

export const deleteConnectorSecret = async (client: ElasticsearchClient, id: string) => {
  return await client.transport.request<ConnectorsAPIUpdateResponse>({
    method: 'DELETE',
    path: `/_connector/_secret/${id}`,
  });
};
