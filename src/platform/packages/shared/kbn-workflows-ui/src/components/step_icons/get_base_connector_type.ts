/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const getBaseConnectorType = (fullConnectorType: string): string => {
  if (fullConnectorType.startsWith('elasticsearch.')) return 'elasticsearch';
  if (fullConnectorType.startsWith('kibana.')) return 'kibana';
  if (fullConnectorType.startsWith('slack_api')) return 'slack';

  let normalized = fullConnectorType;
  if (normalized.startsWith('.')) {
    normalized = normalized.slice(1);
  }
  if (normalized.includes('.')) {
    return normalized.split('.')[0];
  }
  return normalized;
};
