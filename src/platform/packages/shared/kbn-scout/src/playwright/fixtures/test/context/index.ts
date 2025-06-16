/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as os from 'os';
import getPort from 'get-port';
import { BrowserContext, chromium } from 'playwright/test';
import { coreWorkerFixtures } from '../../worker';

/**
 * Launches browser with persistent context across multiple tests / browser windows in the same test.
 * E.g. Lighthouse launches a new browser window and the authentication state
 * is not persisted between windows by default, so we can't do page audit without persistent context.
 */
export const persistentContext = coreWorkerFixtures.extend<
  {
    context: BrowserContext;
  },
  { debuggingPort: number }
>({
  debuggingPort: [
    async ({ log }, use) => {
      const port = await getPort({ port: [9222, 9223, 9224] });
      log.serviceLoaded(`remote debugging port [${port}]`);
      use(port);
    },
    { scope: 'worker' },
  ],
  context: [
    async ({ log, debuggingPort }, use) => {
      const userDataDir = os.tmpdir();
      const context = await chromium.launchPersistentContext(userDataDir, {
        args: [`--remote-debugging-port=${debuggingPort}`],
      });
      log.serviceLoaded(`persistentContext on port [${debuggingPort}]`);
      await use(context);
      await context.close();
    },
    { scope: 'test' },
  ],
});
