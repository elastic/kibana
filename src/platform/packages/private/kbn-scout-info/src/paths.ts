/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';

export const SCOUT_OUTPUT_ROOT = path.resolve(REPO_ROOT, '.scout');

// Servers
export const SCOUT_SERVERS_ROOT = path.resolve(SCOUT_OUTPUT_ROOT, 'servers');

// Reporting
export const SCOUT_REPORT_OUTPUT_ROOT = path.resolve(SCOUT_OUTPUT_ROOT, 'reports');
export const SCOUT_TEST_CONFIG_STATS_PATH = path.resolve(
  SCOUT_OUTPUT_ROOT,
  'test_config_stats.json'
);

// Scout playwright configs
export const SCOUT_PLAYWRIGHT_CONFIGS_PATH = path.resolve(
  SCOUT_OUTPUT_ROOT,
  'test_configs',
  'scout_playwright_configs.json'
);
