/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * TEMPORARY — validation harness for the #274834 / #274869 / #274530 fixes.
 * The flaky test runner only accepts whole config paths, so this scopes a run
 * to new_tab.spec.ts with 20 repeats per job. Drop this commit before opening
 * the PR.
 */

import type { PlaywrightTestConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@kbn/scout';

const base = createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
  runGlobalSetup: true,
});

const config: PlaywrightTestConfig = {
  ...base,
  repeatEach: 20,
  // Setup/teardown projects carry their own testMatch for global.setup.ts /
  // global.teardown.ts and are unaffected.
  testMatch: /new_tab\.spec\.ts/,
};

export default config;
