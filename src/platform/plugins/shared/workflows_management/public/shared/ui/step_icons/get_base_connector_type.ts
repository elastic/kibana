/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const getBaseConnectorType = (fullConnectorType: string): string => {
  if (fullConnectorType.startsWith('elasticsearch.')) {
    return 'elasticsearch';
  } else if (fullConnectorType.startsWith('kibana.')) {
    return 'kibana';
  } else if (fullConnectorType.startsWith('slack_api')) {
    // use the 'slack' icon for slack_api
    return 'slack';
  } else {
    // Handle connectors with dot notation properly
    if (fullConnectorType.startsWith('.')) {
      // For connectors like ".jira", remove the leading dot
      return fullConnectorType.substring(1);
    } else if (fullConnectorType.includes('.')) {
      // For connectors like "thehive.createAlert", use base name
      return fullConnectorType.split('.')[0];
    } else {
      // For simple connectors like "slack", use as-is
      return fullConnectorType;
    }
  }
};
