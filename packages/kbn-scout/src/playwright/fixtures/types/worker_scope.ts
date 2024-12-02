/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, SamlSessionManager } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { LoadActionPerfOptions } from '@kbn/es-archiver';
import { IndexStats } from '@kbn/es-archiver/src/lib/stats';

import { ScoutServerConfig } from '../../../types';
import { KibanaUrl } from '../../../common/services/kibana_url';

interface EsArchiverFixture {
  loadIfNeeded: (
    name: string,
    performance?: LoadActionPerfOptions | undefined
  ) => Promise<Record<string, IndexStats>>;
}

export interface ScoutWorkerFixtures {
  log: ToolingLog;
  config: ScoutServerConfig;
  kbnUrl: KibanaUrl;
  esClient: Client;
  kbnClient: KbnClient;
  esArchiver: EsArchiverFixture;
  samlAuth: SamlSessionManager;
}

// re-export to import types from '@kbn-scout'
export type { KbnClient, SamlSessionManager } from '@kbn/test';
export type { ToolingLog } from '@kbn/tooling-log';
export type { Client } from '@elastic/elasticsearch';
export type { KibanaUrl } from '../../../common/services/kibana_url';
