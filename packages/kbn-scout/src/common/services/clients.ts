/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnClient, createEsClientForTesting } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { ScoutServerConfig } from '../../types';
import { serviceLoadedMsg } from '../../playwright/utils';

interface ClientOptions {
  serviceName: string;
  url: string;
  username: string;
  password: string;
  log: ToolingLog;
}

function createClientUrlWithAuth({ serviceName, url, username, password, log }: ClientOptions) {
  const clientUrl = new URL(url);
  clientUrl.username = username;
  clientUrl.password = password;

  log.debug(serviceLoadedMsg(`${serviceName}client`));
  return clientUrl.toString();
}

export function createEsClient(config: ScoutServerConfig, log: ToolingLog) {
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

export function createKbnClient(config: ScoutServerConfig, log: ToolingLog) {
  const kibanaUrl = createClientUrlWithAuth({
    serviceName: 'Kbn',
    url: config.hosts.kibana,
    username: config.auth.username,
    password: config.auth.password,
    log,
  });

  return new KbnClient({ log, url: kibanaUrl });
}
