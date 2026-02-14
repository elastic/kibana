/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const cloudPasswordAndResetLink = i18n.translate(
  'home.tutorials.common.cloudInstructions.passwordAndResetLink',
  {
    defaultMessage:
      'Where {passwordTemplate} is the password of the `elastic` user.' +
      `'{#config.cloud.profileUrl}'
      Forgot the password? [Reset in Elastic Cloud]('{config.cloud.baseUrl}{config.cloud.deploymentUrl}'/security).
      '{/config.cloud.profileUrl}'` +
      '\n\n\
> **_Important:_**  Do not use the built-in `elastic` user to secure clients in a production environment. Instead set up \
authorized users or API keys, and do not expose passwords in configuration files.',
    values: { passwordTemplate: '`<password>`' },
  }
);

export const cloudServerlessApiKeyNote = i18n.translate(
  'home.tutorials.common.cloudInstructions.serverlessApiKeyNote',
  {
    defaultMessage:
      'Where {endpointUrlTemplate} is the Elasticsearch endpoint URL for your Serverless project \
and {apiKeyTemplate} is an API key with the appropriate privileges. \
To find your endpoint URL, go to the **Help** menu and select **Connection details**. \
To create an API key, refer to [Create API key]({createApiKeyUrl}). \
For information on the required privileges, refer to [Grant access using API keys]({grantAccessUrl}).\n\n\
> **_Important:_**  Elasticsearch Serverless does not support `cloud.id`, `cloud.auth`, \
or username/password authentication. You must use the Elasticsearch endpoint URL and an API key.',
    values: {
      endpointUrlTemplate: '`<elasticsearch_endpoint_url>`',
      apiKeyTemplate: '`<your_api_key>`',
      createApiKeyUrl:
        'https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-connection-details#create-an-api-key-serverless',
      grantAccessUrl: 'https://www.elastic.co/docs/reference/beats/filebeat/beats-api-keys',
    },
  }
);
