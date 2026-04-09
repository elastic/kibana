/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { test as base } from '@playwright/test';
import type { ScoutLogger } from '../../worker';

let lastLoggedFile = '';

/**
 * Auto-fixture that logs the test file path once per file per worker.
 * Each Playwright worker runs in its own process, so the module-level
 * variable naturally isolates per worker. Only logs when the worker
 * picks up a new file, avoiding noise from repeated per-test logging.
 */
export const logTestFileFixture = base.extend<{ logTestFile: void }, { log: ScoutLogger }>({
  logTestFile: [
    async ({ log }, use, testInfo) => {
      if (testInfo.file !== lastLoggedFile) {
        lastLoggedFile = testInfo.file;
        log.debug(`[testFile] ${path.basename(testInfo.file)}`);
      }
      await use();
    },
    { auto: true },
  ],
});
