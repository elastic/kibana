/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { systemIndicesSuperuser } from '@kbn/test';

import { format as formatUrl } from 'url';

import supertest, { AgentOptions } from 'supertest';
import { FtrProviderContext } from './ftr_provider_context';

export function KibanaSupertestProvider({ getService }: FtrProviderContext): supertest.Agent {
  const config = getService('config');
  const kibanaServerConfig = config.get('servers.kibana');
  const kibanaServerUrl = formatUrl(kibanaServerConfig);

  const options: AgentOptions = {};
  if (kibanaServerConfig.certificateAuthorities) {
    options.ca = kibanaServerConfig.certificateAuthorities;
    options.rejectUnauthorized = false;
  }

  const serverArgs = config.get('kbnTestServer.serverArgs', []) as string[];
  const http2Enabled = serverArgs.includes('--server.protocol=http2');
  if (http2Enabled) {
    options.http2 = true;
  }

  return supertest(kibanaServerUrl, options);
}

export function ElasticsearchSupertestProvider({
  getService,
}: FtrProviderContext): supertest.Agent {
  const config = getService('config');
  const esServerConfig = config.get('servers.elasticsearch');

  // For stateful tests, use system indices user so tests can write to system indices
  // For serverless tests, we don't have a system indices user, so we're using the default superuser
  const elasticSearchServerUrl = formatUrl({
    ...esServerConfig,
    ...(config.get('serverless')
      ? []
      : { auth: `${systemIndicesSuperuser.username}:${systemIndicesSuperuser.password}` }),
  });

  let agentOptions = {};
  if ('certificateAuthorities' in esServerConfig) {
    agentOptions = { ca: esServerConfig!.certificateAuthorities };
  }

  return supertest.agent(elasticSearchServerUrl, agentOptions);
}
