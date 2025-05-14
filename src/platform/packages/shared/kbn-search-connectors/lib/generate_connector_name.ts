/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

import { kebabCase } from 'lodash';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { toAlphanumeric } from '../utils/to_alphanumeric';
import { indexOrAliasExists } from './exists_index';
import { MANAGED_CONNECTOR_INDEX_PREFIX } from '../constants';

const GENERATE_INDEX_NAME_ERROR = 'generate_index_name_error';

export const toValidIndexName = (str: string): string => {
  if (!str || str.trim() === '') {
    return 'index';
  }

  // Start with kebabCase to handle most transformations
  let result = kebabCase(str);

  // Additional processing for ES index name requirements
  result = result
    // ES doesn't allow \, /, *, ?, ", <, >, |, comma, #, :
    .replace(/[\\/*?"<>|,#:]/g, '-')
    // Cannot start with -, _, +
    .replace(/^[-_+]/, '');

  // Remove trailing hyphens
  while (result.endsWith('-')) {
    result = result.slice(0, -1);
  }

  return result;
};

export const generateConnectorName = async (
  client: ElasticsearchClient,
  connectorType: string,
  isNative: boolean,
  userConnectorName?: string
): Promise<{ connectorName: string; indexName: string }> => {
  const prefix = toAlphanumeric(connectorType);
  if (!prefix || prefix.length === 0) {
    throw new Error('Connector type or connectorName is required');
  }

  const nativePrefix = isNative ? MANAGED_CONNECTOR_INDEX_PREFIX : '';

  // Handle user-provided connector name
  if (userConnectorName) {
    // Keep original connector name, but sanitize it for index name
    const sanitizedName = toValidIndexName(userConnectorName);

    // First try with the sanitized name directly
    let indexName = `${nativePrefix}connector-${sanitizedName}`;
    const baseNameExists = await indexOrAliasExists(client, indexName);

    if (!baseNameExists) {
      return {
        connectorName: userConnectorName, // Keep original connector name
        indexName,
      };
    }

    // If base name exists, try with random suffixes
    for (let i = 0; i < 20; i++) {
      const uniqueSuffix = uuidv4().split('-')[1].slice(0, 4);
      indexName = `${nativePrefix}connector-${sanitizedName}-${uniqueSuffix}`;

      const exists = await indexOrAliasExists(client, indexName);
      if (!exists) {
        return {
          connectorName: userConnectorName, // Keep original connector name
          indexName,
        };
      }
    }
  } else {
    // Auto-generate a connector name
    for (let i = 0; i < 20; i++) {
      const uniqueSuffix = uuidv4().split('-')[1].slice(0, 4);
      const connectorName = `${toValidIndexName(prefix)}-${uniqueSuffix}`;
      const indexName = `${nativePrefix}connector-${connectorName}`;

      const exists = await indexOrAliasExists(client, indexName);
      if (!exists) {
        return {
          connectorName,
          indexName,
        };
      }
    }
  }

  throw new Error(GENERATE_INDEX_NAME_ERROR);
};
