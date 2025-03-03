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
import { ScoutLogger } from './logger';
import { ScoutTestConfig, EsClient } from '../../types';

interface ClientOptions {
  serviceName: string;
  url: string;
  username: string;
  password: string;
  log: ScoutLogger | ToolingLog;
}

function createClientUrlWithAuth({ serviceName, url, username, password, log }: ClientOptions) {
  const clientUrl = new URL(url);
  clientUrl.username = username;
  clientUrl.password = password;

  if (log instanceof ScoutLogger) {
    log.serviceLoaded(`${serviceName}Client`);
  }

  return clientUrl.toString();
}

let esClientInstance: EsClient | null = null;
let kbnClientInstance: KbnClient | null = null;

export function getEsClient(config: ScoutTestConfig, log: ScoutLogger | ToolingLog) {
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

export function getKbnClient(config: ScoutTestConfig, log: ScoutLogger) {
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
