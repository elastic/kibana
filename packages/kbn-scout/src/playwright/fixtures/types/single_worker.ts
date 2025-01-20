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
import { EsClient, KbnClient, KibanaUrl, ScoutTestConfig } from '../common';
import { ScoutPage } from '../common/test_scope/page';
import { BrowserAuthFixture } from '../common/test_scope/browser_auth';
import { UiSettingsFixture } from '../single_worker/worker_scope/ui_settings';

export interface ScoutTestFixtures {
  browserAuth: BrowserAuthFixture;
  page: ScoutPage;
  pageObjects: PageObjects;
}

export interface ScoutWorkerFixtures {
  log: ToolingLog;
  config: ScoutTestConfig;
  kbnUrl: KibanaUrl;
  kbnClient: KbnClient;
  esClient: EsClient;
  uiSettings: UiSettingsFixture;
}
