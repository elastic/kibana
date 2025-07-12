/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RunnerResult } from 'lighthouse';
import { coreWorkerFixtures } from '../core_fixtures';

type OutputMode = 'html' | 'json' | 'csv';
export interface LighthouseAuditOptions {
  maxWaitForLoad?: number;
  screenEmulation?: {
    width: number;
    height: number;
  };
}

export interface LighthouseFixture {
  runAudit: (url: string, options?: LighthouseAuditOptions) => Promise<RunnerResult>;
}

/**
 * Lighthouse fixture https://developer.chrome.com/docs/lighthouse/overview/
 * It allows to run Lighthouse audits on a given URL
 */
export const lighthouseFixture = coreWorkerFixtures.extend<
  { lighthouse: LighthouseFixture },
  { debuggingPort: number }
>({
  lighthouse: [
    async ({ log, debuggingPort }, use, testInfo) => {
      // Import Lighthouse dynamically (ES module)
      const lighthouse = (await import('lighthouse')).default;

      if (!debuggingPort) {
        throw new Error(
          `Remote debugging port is not set: Check 'use.launchOptions.args' in Playwright configuration`
        );
      }

      const DEFAULT_AUDIT_OPTIONS: Partial<import('lighthouse').Flags> = {
        maxWaitForLoad: 30000,
        output: ['html'],
        formFactor: 'desktop',
        screenEmulation: {
          width: 1920,
          height: 1080,
          mobile: false,
          deviceScaleFactor: 1,
          disabled: false,
        },
      };

      const runAudit = async (url: string, auditOptions?: LighthouseAuditOptions) => {
        const options: import('lighthouse').Flags = {
          port: debuggingPort,
          maxWaitForLoad: auditOptions?.maxWaitForLoad ?? DEFAULT_AUDIT_OPTIONS.maxWaitForLoad,
          output: DEFAULT_AUDIT_OPTIONS.output as OutputMode[],
          formFactor: DEFAULT_AUDIT_OPTIONS.formFactor as 'desktop' | 'mobile',
          screenEmulation: {
            width:
              auditOptions?.screenEmulation?.width ?? DEFAULT_AUDIT_OPTIONS.screenEmulation!.width,
            height:
              auditOptions?.screenEmulation?.height ??
              DEFAULT_AUDIT_OPTIONS.screenEmulation!.height,
            mobile: DEFAULT_AUDIT_OPTIONS.screenEmulation!.mobile,
            deviceScaleFactor: DEFAULT_AUDIT_OPTIONS.screenEmulation!.deviceScaleFactor,
            disabled: DEFAULT_AUDIT_OPTIONS.screenEmulation!.disabled,
          },
        };

        const auditResult = await lighthouse(url, options);

        if (!auditResult?.lhr?.categories?.performance?.score) {
          throw new Error('Lighthouse audit failed: No performance score found');
        }

        const perfScore = auditResult.lhr.categories.performance.score;
        log.info(`✅ Lighthouse audit completed with performance score: ${perfScore}`);

        testInfo.attach('lighthouse-report', {
          body: auditResult.report?.[0] ?? 'No report generated',
          contentType: 'text/html',
        });

        return auditResult;
      };

      use({ runAudit });
    },
    { scope: 'test' },
  ],
});
