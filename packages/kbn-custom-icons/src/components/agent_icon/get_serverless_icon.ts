/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ServerlessType } from '@kbn/elastic-agent-utils';
import defaultIcon from '../../../assets/default.svg';
import lambdaIcon from '../../../assets/lambda.svg';
import azureFunctionsIcon from '../../../assets/functions.svg';

const serverlessIcons: Record<ServerlessType, string> = {
  'aws.lambda': lambdaIcon,
  'azure.functions': azureFunctionsIcon,
} as const;

export function getServerlessIcon(serverlessType?: ServerlessType) {
  if (!serverlessType) {
    return defaultIcon;
  }
  return serverlessIcons[serverlessType] ?? defaultIcon;
}
