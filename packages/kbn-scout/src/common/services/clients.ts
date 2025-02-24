/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEsClientForTesting, KbnClient } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import supertest, { type AgentOptions } from 'supertest';
import { kbnTestConfig } from '@kbn/test';
import * as Url from 'url';
import { ScoutLogger } from './logger';
import { ScoutTestConfig, EsClient } from '../../types';
interface ClientOptions {
  serviceName: string;
  url: string;
  username: string;
  password: string;
  log?: ScoutLogger | ToolingLog;
}

function createClientUrlWithAuth({ serviceName, url, username, password, log }: ClientOptions) {
  const clientUrl = new URL(url);
  clientUrl.username = username;
  clientUrl.password = password;

  if (log instanceof ScoutLogger) log.serviceLoaded(`${serviceName}Client`);

  return clientUrl.toString();
}

let esClientInstance: EsClient | null = null;
let kbnClientInstance: KbnClient | null = null;
let kbnSuperTestWithAuthClientInstance: supertest.Agent | null = null;

export const kbnSuperTestWithAuthClient = () => {
  if (!kbnSuperTestWithAuthClientInstance) {
    const kibanaUrl = createClientUrlWithAuth({
      serviceName: 'kbn',
      url: Url.format({
        protocol: kbnTestConfig.getUrlParts().protocol,
        hostname: kbnTestConfig.getUrlParts().hostname,
        port: kbnTestConfig.getUrlParts().port,
      }),
      username: 'elastic',
      password: 'changeme',
    });

    const options: AgentOptions = {};
    // if (kibanaServerConfig.certificateAuthorities) {
    //   options.ca = kibanaServerConfig.certificateAuthorities;
    //   options.rejectUnauthorized = false;
    // }

    // const serverArgs = config.get('kbnTestServer.serverArgs', []) as string[];
    // const http2Enabled = serverArgs.includes('--server.protocol=http2');
    // if (http2Enabled) {
    //   options.http2 = true;
    // }

    kbnSuperTestWithAuthClientInstance = supertest(kibanaUrl, options);
  }

  return kbnSuperTestWithAuthClientInstance;
};

export function getEsClient(config: ScoutTestConfig, log: ScoutLogger | ToolingLog): EsClient {
  if (!esClientInstance) {
    const { username, password } = config.auth;
    const elasticsearchUrl = createClientUrlWithAuth({
      serviceName: 'es',
      url: config.hosts.elasticsearch,
      username,
      password,
      log,
    });

    esClientInstance = createEsClientForTesting({
      esUrl: elasticsearchUrl,
      authOverride: { username, password },
    });
  }

  return esClientInstance;
}

export function getKbnClient(config: ScoutTestConfig, log: ScoutLogger): KbnClient {
  if (!kbnClientInstance) {
    const kibanaUrl = createClientUrlWithAuth({
      serviceName: 'kbn',
      url: config.hosts.kibana,
      username: config.auth.username,
      password: config.auth.password,
      log,
    });

    kbnClientInstance = new KbnClient({ log, url: kibanaUrl });
  }

  return kbnClientInstance;
}
