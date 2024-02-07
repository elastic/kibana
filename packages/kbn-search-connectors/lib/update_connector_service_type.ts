/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { CONNECTORS_INDEX, fetchConnectorById } from '..';

import { ConnectorDocument, ConnectorStatus } from '../types/connectors';

export const updateConnectorServiceType = async (
  client: ElasticsearchClient,
  connectorId: string,
  serviceType: string
) => {
  const connector = await fetchConnectorById(client, connectorId);

  if (connector) {
    const result = await client.index<ConnectorDocument>({
      document: {
        ...connector,
        configuration: {},
        service_type: serviceType,
        status:
          connector.status === ConnectorStatus.CREATED
            ? ConnectorStatus.CREATED
            : ConnectorStatus.NEEDS_CONFIGURATION,
      },
      id: connectorId,
      index: CONNECTORS_INDEX,
    });
    return result;
  } else {
    throw new Error(
      i18n.translate('searchConnectors.server.connectors.serviceType.error', {
        defaultMessage: 'Could not find document',
      })
    );
  }
};
