/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RunnerResult } from 'lighthouse';
import { coreWorkerFixtures } from './core_fixtures';

export interface AuditOptions {
  maxWaitForLoad?: number;
  screenEmulation?: {
    width: number;
    height: number;
  };
}

export interface LighthouseFixture {
  runAudit: (url: string, options?: AuditOptions) => Promise<RunnerResult>;
}

export const lighthouseFixture = coreWorkerFixtures.extend<
  {},
  { lighthouse: LighthouseFixture; debuggingPort: number }
>({
  /**
   * Fixture to run Lighthouse audit
   */
  lighthouse: [
    async ({ log, debuggingPort }, use) => {
      // ES module import issue
      const lighthouse = (await import('lighthouse')).default;

      if (!debuggingPort) {
        throw new Error(
          `Remote debugging port is not set: check 'use.launchOptions.args' in Playwright configuration`
        );
      }

      const runAudit = async (url: string, auditOptions?: AuditOptions) => {
        const auditResult = await lighthouse(url, {
          port: debuggingPort,
          maxWaitForLoad: auditOptions?.maxWaitForLoad || 30000,
          output: ['html'],
          formFactor: 'desktop',
          screenEmulation: {
            width: auditOptions?.screenEmulation?.width || 1920,
            height: auditOptions?.screenEmulation?.height || 1080,
            mobile: false,
            deviceScaleFactor: 1,
            disabled: false,
          },
        });

        if (!auditResult) {
          throw new Error('Lighthouse audit failed');
        }

        log.debug(
          `Lighthouse audit completed with '${auditResult.lhr.categories.performance.score}' perf score`
        );

        return auditResult;
      };

      use({ runAudit });
    },
    { scope: 'worker' },
  ],
});
