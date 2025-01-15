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
import { ScoutTestConfig } from '../../../types';
import { KibanaUrl } from '../../../common/services/kibana_url';
import { EsArchiverFixture, UiSettingsFixture } from './worker_scope';

export interface WorkerSpaceFixure {
  id: string;
  name: string;
}

/**
 * The `ScoutWorkerFixtures` type defines the set of fixtures that are available
 */
export interface ParallelRunWorkerFixtures {
  log: ToolingLog;
  config: ScoutTestConfig;
  esArchiver: EsArchiverFixture;
  esClient: Client;
  kbnClient: KbnClient;
  kbnUrl: KibanaUrl;
  uiSettings: UiSettingsFixture;
  samlAuth: SamlSessionManager;
  workerSpace: WorkerSpaceFixure;
}
