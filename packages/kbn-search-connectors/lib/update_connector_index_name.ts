/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { CONNECTORS_INDEX, fetchConnectorByIndexName } from '..';

export const updateConnectorIndexName = async (
  client: ElasticsearchClient,
  connectorId: string,
  indexName: string
): Promise<WriteResponseBase> => {
  const connectorResult = await fetchConnectorByIndexName(client, indexName);
  if (connectorResult) {
    throw new Error(
      i18n.translate('searchConnectors.server.connectors.indexName.error', {
        defaultMessage:
          'This index has already been registered to connector {connectorId}. Please delete that connector or select a different index name.',
        values: { connectorId },
      })
    );
  }
  return await client.update({
    index: CONNECTORS_INDEX,
    doc: { index_name: indexName },
    id: connectorId,
  });
};
