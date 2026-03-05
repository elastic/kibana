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
  } else if (fullConnectorType.startsWith('data.')) {
    // data.* is a built-in step type, so we return it as-is
    return fullConnectorType;
  } else {
    if (fullConnectorType.startsWith('.')) {
      return fullConnectorType.slice(1);
    }
    // For step types like "aws_lambda.invoke" or "virustotal.scanFileHash",
    // extract the base connector name before the action suffix.
    if (fullConnectorType.includes('.')) {
      return fullConnectorType.split('.')[0];
    }
    return fullConnectorType;
  }
};
