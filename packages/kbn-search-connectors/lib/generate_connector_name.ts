/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { toAlphanumeric } from '../utils/to_alphanumeric';
import { indexOrAliasExists } from './exists_index';

const GENERATE_INDEX_NAME_ERROR = 'generate_index_name_error';

export const generateConnectorName = async (
  client: ElasticsearchClient,
  connectorType: string,
  userConnectorName?: string
): Promise<{ connectorName: string; indexName: string }> => {
  const prefix = toAlphanumeric(connectorType);
  if (!prefix || prefix.length === 0) {
    throw new Error('Connector type or connectorName is required');
  }

  if (userConnectorName) {
    let indexName = `connector-${userConnectorName}`;
    const resultSameName = await indexOrAliasExists(client, indexName);
    // index with same name doesn't exist
    if (!resultSameName) {
      return {
        connectorName: userConnectorName,
        indexName,
      };
    }
    // if the index name already exists, we will generate until it doesn't for 20 times
    for (let i = 0; i < 20; i++) {
      indexName = `connector-${userConnectorName}-${uuidv4().split('-')[1].slice(0, 4)}`;

      const result = await indexOrAliasExists(client, indexName);
      if (!result) {
        return {
          connectorName: userConnectorName,
          indexName,
        };
      }
    }
  } else {
    for (let i = 0; i < 20; i++) {
      const connectorName = `${prefix}-${uuidv4().split('-')[1].slice(0, 4)}`;
      const indexName = `connector-${connectorName}`;

      const result = await indexOrAliasExists(client, indexName);
      if (!result) {
        return {
          connectorName,
          indexName,
        };
      }
    }
  }
  throw new Error(GENERATE_INDEX_NAME_ERROR);
};
