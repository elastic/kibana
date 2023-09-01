/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { CONNECTORS_INDEX } from '..';

import { Connector, ConnectorDocument } from '../types/connectors';

export const updateConnectorNameAndDescription = async (
  client: ElasticsearchClient,
  connectorId: string,
  connectorUpdates: Partial<Pick<Connector, 'name' | 'description'>>
) => {
  const connectorResult = await client.get<ConnectorDocument>({
    id: connectorId,
    index: CONNECTORS_INDEX,
  });
  const connector = connectorResult._source;
  if (connector) {
    const result = await client.index<ConnectorDocument>({
      document: { ...connector, ...connectorUpdates },
      id: connectorId,
      index: CONNECTORS_INDEX,
    });
    await client.indices.refresh({ index: CONNECTORS_INDEX });
    return result;
  } else {
    throw new Error(
      i18n.translate('xpack.enterpriseSearch.server.connectors.serviceType.error', {
        defaultMessage: 'Could not find document',
      })
    );
  }
};
