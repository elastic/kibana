/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Return a new SuperAgentTest instance for every API call to avoid cookie caching.
 * If you want to verify cookies are empty use the following code:
 * import { CookieAccessInfo } from 'cookiejar';
 * console.log(JSON.stringify(agent.jar.getCookies(CookieAccessInfo.All)));
 */

import supertest, { SuperAgentTest } from 'supertest';
import { format as formatUrl } from 'url';

import { systemIndicesSuperuser } from '@kbn/test';
import { FtrProviderContext } from './ftr_provider_context';

export type FtrSupertest = Pick<
  SuperAgentTest,
  'auth' | 'get' | 'delete' | 'patch' | 'post' | 'put'
>;

function createNewAgent(host: string, agentOptions?: { ca?: string[] }) {
  return {
    auth(user: string, pass: string, options?: { type: 'basic' | 'auto' } | undefined) {
      const agent = supertest.agent(host, agentOptions);
      return agent.auth(user, pass, options);
    },
    get(url: string) {
      const agent = supertest.agent(host, agentOptions);
      return agent.get(url);
    },
    delete(url: string) {
      const agent = supertest.agent(host, agentOptions);
      return agent.delete(url);
    },
    patch(url: string) {
      const agent = supertest.agent(host, agentOptions);
      return agent.patch(url);
    },
    post(url: string) {
      const agent = supertest.agent(host, agentOptions);
      return agent.post(url);
    },
    put(url: string) {
      const agent = supertest.agent(host, agentOptions);
      return agent.put(url);
    },
  } as FtrSupertest;
}

export function KibanaSupertestProvider({ getService }: FtrProviderContext): FtrSupertest {
  const config = getService('config');
  const kbnUrl = formatUrl(config.get('servers.kibana'));
  const ca = config.get('servers.kibana').certificateAuthorities as string[];

  return createNewAgent(kbnUrl, { ca });
}

export function KibanaSupertestWithoutAuthProvider({
  getService,
}: FtrProviderContext): FtrSupertest {
  const config = getService('config');
  const kbnUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: false,
  });
  const ca = config.get('servers.kibana').certificateAuthorities as string[];

  return createNewAgent(kbnUrl, { ca });
}

export function ElasticsearchSupertestProvider({ getService }: FtrProviderContext): FtrSupertest {
  const config = getService('config');
  const esServerConfig = config.get('servers.elasticsearch');
  const isServerless = !!config.get('serverless');

  // For stateful tests, use system indices user so tests can write to system indices
  // For serverless tests, we don't have a system indices user, so we're using the default superuser
  const elasticSearchServerUrl = formatUrl({
    ...esServerConfig,
    ...(isServerless
      ? []
      : { auth: `${systemIndicesSuperuser.username}:${systemIndicesSuperuser.password}` }),
  });
  const ca = esServerConfig?.certificateAuthorities as string[];

  return createNewAgent(elasticSearchServerUrl, { ca });
}

/**
 * Supertest provider that doesn't include user credentials into base URL that is passed
 * to the supertest.
 */
export function ElasticsearchSupertestWithoutAuthProvider({
  getService,
}: FtrProviderContext): FtrSupertest {
  const config = getService('config');
  const esServerConfig = config.get('servers.elasticsearch');
  const elasticSearchServerUrl = formatUrl({
    ...esServerConfig,
    auth: false,
  });

  return createNewAgent(elasticSearchServerUrl);
}
