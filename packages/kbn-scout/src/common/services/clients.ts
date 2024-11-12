/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Url from 'url';
import { KbnClient, createEsClientForTesting } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { ScoutServerConfig } from '../../types';
import { serviceLoadedMsg } from '../../playwright/utils';

export function createEsClient(config: ScoutServerConfig, log: ToolingLog) {
  const elasticsearchUrl = config.hosts.elasticsearch;
  const { username, password } = config.auth;
  const esClient = createEsClientForTesting({
    esUrl: Url.format(elasticsearchUrl),
    authOverride: {
      username,
      password,
    },
  });

  log.debug(serviceLoadedMsg('esClient'));

  return esClient;
}

export function createKbnClient(serversConfig: ScoutServerConfig, log: ToolingLog) {
  const kibanaUrl = new URL(serversConfig.hosts.kibana);
  kibanaUrl.username = serversConfig.auth.username;
  kibanaUrl.password = serversConfig.auth.password;

  const kbnClient = new KbnClient({
    log,
    url: kibanaUrl.toString(),
  });

  log.debug(serviceLoadedMsg('kbnClient'));

  return kbnClient;
}
