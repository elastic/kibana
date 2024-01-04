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
  const connectorResult = await fetchConnectorById(client, connectorId);

  if (connectorResult?.value) {
    const result = await client.index<ConnectorDocument>({
      document: {
        ...connectorResult.value,
        configuration: {},
        service_type: serviceType,
        status:
          connectorResult.value.status === ConnectorStatus.CREATED
            ? ConnectorStatus.CREATED
            : ConnectorStatus.NEEDS_CONFIGURATION,
      },
      id: connectorId,
      index: CONNECTORS_INDEX,
      if_seq_no: connectorResult.seqNo,
      if_primary_term: connectorResult.primaryTerm,
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
