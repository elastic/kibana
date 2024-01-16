/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';

import { ConnectorDocument, SchedulingConfiguraton } from '../types/connectors';

export const updateConnectorScheduling = async (
  client: ElasticsearchClient,
  connectorId: string,
  scheduling: SchedulingConfiguraton
) => {
  try {
    const result = await client.transport.request<ConnectorDocument>({
      method: 'PUT',
      path: `/_connector/${connectorId}/_scheduling`,
      body: {
        scheduling,
      },
    });
    return result;
  } catch (err) {
    const isResponseError = err instanceof errors.ResponseError;

    const isDocumentMissingError =
      isResponseError && err?.body?.error?.type === 'document_missing_exception';

    if (isDocumentMissingError) {
      throw new Error(
        i18n.translate('searchConnectors.server.connectors.scheduling.error', {
          defaultMessage: 'Could not find document',
        })
      );
    }

    throw err;
  }
};
