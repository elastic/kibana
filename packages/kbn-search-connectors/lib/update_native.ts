/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Result } from '@elastic/elasticsearch/lib/api/types';

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { i18n } from '@kbn/i18n';
import { isNotFoundException } from '../utils/identify_exceptions';

export const putUpdateNative = async (
  client: ElasticsearchClient,
  connectorId: string,
  isNative: boolean
) => {
  try {
    const result = await client.transport.request<Result>({
      method: 'PUT',
      path: `/_connector/${connectorId}/_native`,
      body: {
        is_native: isNative,
      },
    });
    return result;
  } catch (err) {
    if (isNotFoundException(err)) {
      throw new Error(
        i18n.translate('searchConnectors.server.connectors.native.error', {
          defaultMessage: 'Could not find document',
        })
      );
    }

    throw err;
  }
};
