/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { CURRENT_CONNECTORS_INDEX } from '..';

import { Connector, IngestPipelineParams } from '../types/connectors';
import { createConnectorDocument } from './create_connector_document';

export const createConnector = async (
  client: ElasticsearchClient,
  input: {
    indexName: string | null;
    isNative: boolean;
    language: string | null;
    pipeline: IngestPipelineParams;
    serviceType?: string | null;
  }
): Promise<Connector> => {
  const document = createConnectorDocument({
    ...input,
    serviceType: input.serviceType || null,
  });

  const result = await client.index({
    document,
    index: CURRENT_CONNECTORS_INDEX,
    refresh: 'wait_for',
  });

  return { ...document, id: result._id };
};
