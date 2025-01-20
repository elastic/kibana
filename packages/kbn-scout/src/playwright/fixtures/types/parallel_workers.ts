/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { PageObjects } from '../../page_objects';
import { BrowserAuthFixture, ScoutPageSpaceFixture } from '../parallel_workers/test_scope';
import { EsClient, KbnClient, KibanaUrl, ScoutTestConfig } from '../common';
import { KbnSpaceFixture } from '../parallel_workers';

export interface ParallelRunTestFixtures {
  browserAuth: BrowserAuthFixture;
  page: ScoutPageSpaceFixture;
  pageObjects: PageObjects;
}

export interface ParallelRunWorkerFixtures {
  log: ToolingLog;
  config: ScoutTestConfig;
  esClient: EsClient;
  kbnClient: KbnClient;
  kbnSpace: KbnSpaceFixture;
  kbnUrl: KibanaUrl;
}
