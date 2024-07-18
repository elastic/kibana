/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Result } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export const updateConnectorServiceType = async (
  client: ElasticsearchClient,
  connectorId: string,
  serviceType: string
) => {
  // First clear connector configuration
  await client.transport.request<Result>({
    method: 'PUT',
    path: `/_connector/${connectorId}/_configuration`,
    body: {
      configuration: {},
    },
  });
  // Then update service type, on startup connector framework
  // will populate missing config fields
  return await client.transport.request<Result>({
    method: 'PUT',
    path: `/_connector/${connectorId}/_service_type`,
    body: {
      service_type: serviceType,
    },
  });
};
