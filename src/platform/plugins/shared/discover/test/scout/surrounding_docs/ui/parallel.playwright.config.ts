/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPlaywrightConfig } from '@kbn/scout';

const config = createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
  runGlobalSetup: true,
});

// TEMPORARY (revert before merge): capture Playwright traces on failure to diagnose the
// default_columns CI-only failure on serverless observability. Traces land in
// .scout/test-artifacts and include DOM snapshots, network, console, and URL per action.
config.use = { ...config.use, trace: 'retain-on-failure' };

export default config;
