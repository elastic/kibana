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

import { ConnectorDocument, SchedulingConfiguraton } from '../types/connectors';

export const updateConnectorScheduling = async (
  client: ElasticsearchClient,
  connectorId: string,
  scheduling: SchedulingConfiguraton
) => {
  const connectorResult = await client.get<ConnectorDocument>({
    id: connectorId,
    index: CONNECTORS_INDEX,
  });
  const connector = connectorResult._source;
  if (connector) {
    const result = await client.index<ConnectorDocument>({
      document: { ...connector, scheduling },
      id: connectorId,
      index: CONNECTORS_INDEX,
    });
    await client.indices.refresh({ index: CONNECTORS_INDEX });
    return result;
  } else {
    throw new Error(
      i18n.translate('xpack.enterpriseSearch.server.connectors.scheduling.error', {
        defaultMessage: 'Could not find document',
      })
    );
  }
};
