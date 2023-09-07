/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { CONNECTORS_INDEX } from '..';
import { Connector } from '../types/connectors';

export const putUpdateNative = async (
  client: ElasticsearchClient,
  connectorId: string,
  isNative: boolean
) => {
  const result = await client.update<Connector>({
    doc: {
      is_native: isNative,
    },
    id: connectorId,
    index: CONNECTORS_INDEX,
  });

  return result;
};
