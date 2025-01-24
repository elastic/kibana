/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { EsArchiver } from '@kbn/es-archiver';
import { REPO_ROOT } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/test';
import { ScoutLogger } from './logger';

export function createEsArchiver(esClient: Client, kbnClient: KbnClient, log: ScoutLogger) {
  const esArchiver = new EsArchiver({
    log,
    client: esClient,
    kbnClient,
    baseDir: REPO_ROOT,
  });

  log.serviceMessage(`'esArchiver' loaded`);

  return esArchiver;
}
