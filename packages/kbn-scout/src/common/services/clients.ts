/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnClient, createEsClientForTesting } from '@kbn/test';
import { ScoutLogger } from './logger';
import { ScoutTestConfig } from '../../types';

interface ClientOptions {
  serviceName: string;
  url: string;
  username: string;
  password: string;
  log: ScoutLogger;
}

function createClientUrlWithAuth({ serviceName, url, username, password, log }: ClientOptions) {
  const clientUrl = new URL(url);
  clientUrl.username = username;
  clientUrl.password = password;

  log.serviceMessage(`'${serviceName}client' loaded`);
  return clientUrl.toString();
}

export function createEsClient(config: ScoutTestConfig, log: ScoutLogger) {
  const { username, password } = config.auth;
  const elasticsearchUrl = createClientUrlWithAuth({
    serviceName: 'Es',
    url: config.hosts.elasticsearch,
    username,
    password,
    log,
  });

  return createEsClientForTesting({
    esUrl: elasticsearchUrl,
    authOverride: { username, password },
  });
}

export function createKbnClient(config: ScoutTestConfig, log: ScoutLogger) {
  const kibanaUrl = createClientUrlWithAuth({
    serviceName: 'Kbn',
    url: config.hosts.kibana,
    username: config.auth.username,
    password: config.auth.password,
    log,
  });

  return new KbnClient({ log, url: kibanaUrl });
}
