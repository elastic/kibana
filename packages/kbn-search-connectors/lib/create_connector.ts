/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { fetchConnectorById } from '..';

import { Connector, ConnectorConfiguration, IngestPipelineParams } from '../types/connectors';

export const createConnector = async (
  client: ElasticsearchClient,
  input: {
    configuration?: ConnectorConfiguration;
    features?: Connector['features'];
    indexName: string | null;
    isNative: boolean;
    language: string | null;
    name?: string;
    pipeline?: IngestPipelineParams;
    serviceType?: string | null;
  }
): Promise<Connector> => {
  const { id: connectorId } = await client.transport.request<{ id: string }>({
    method: 'POST',
    path: `/_connector`,
    body: {
      ...(input.indexName && { index_name: input.indexName }),
      is_native: input.isNative,
      ...(input.language && { language: input.language }),
      name: input.name || '',
      ...(input.serviceType && { service_type: input.serviceType }),
    },
  });

  if (input.pipeline) {
    await client.transport.request({
      method: 'PUT',
      path: `/_connector/${connectorId}/_pipeline`,
      body: { pipeline: input.pipeline },
    });
  }

  if (input.features) {
    await client.transport.request({
      method: 'PUT',
      path: `/_connector/${connectorId}/_features`,
      body: { features: input.features },
    });
  }

  if (input.configuration) {
    await client.transport.request({
      method: 'PUT',
      path: `/_connector/${connectorId}/_configuration`,
      body: { configuration: input.configuration },
    });
  }

  // createConnector function expects to return a Connector doc, so we fetch it from the index
  const connector = await fetchConnectorById(client, connectorId);

  if (!connector) {
    throw new Error(
      i18n.translate('searchConnectors.server.connectors.not_found_error', {
        defaultMessage: 'Could not retrieve the created connector',
      })
    );
  }

  return connector;
};
