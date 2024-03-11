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

import { fetchConnectorById } from './fetch_connectors';
import { ConnectorConfiguration, ConnectorDocument, ConnectorStatus } from '../types/connectors';
import { isConfigEntry } from '../utils/is_category_entry';
import { isNotNullish } from '../utils/is_not_nullish';

export const updateConnectorConfiguration = async (
  client: ElasticsearchClient,
  connectorId: string,
  configuration: Record<string, string | number | boolean>
) => {
  const connector = await fetchConnectorById(client, connectorId);
  if (connector) {
    const status =
      connector.status === ConnectorStatus.NEEDS_CONFIGURATION ||
      connector.status === ConnectorStatus.CREATED
        ? ConnectorStatus.CONFIGURED
        : connector.status;
    const updatedConfig: ConnectorConfiguration = Object.keys(connector.configuration)
      .map((key) => {
        const configEntry = connector.configuration[key];
        return isConfigEntry(configEntry)
          ? {
              ...configEntry, // ugly but needed because typescript refuses to believe this is defined
              key,
              value: configuration[key] ?? configEntry.value,
            }
          : undefined;
      })
      .filter(isNotNullish)
      .reduce((prev: ConnectorConfiguration, curr) => {
        const { key, ...config } = curr;
        return { ...prev, [curr.key]: config };
      }, {});
    await client.update<ConnectorDocument>({
      doc: { configuration: updatedConfig, status },
      id: connectorId,
      index: CONNECTORS_INDEX,
    });
    return updatedConfig;
  } else {
    throw new Error(
      i18n.translate('searchConnectors.server.connectors.configuration.error', {
        defaultMessage: 'Could not find connector',
      })
    );
  }
};
