/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RunnerResult, Flags } from 'lighthouse';
import { lighthouseTest } from '@kbn/scout';
import type { PerfLighthouseAuditOptions, PerfLighthouseFixture } from './types';

const DEFAULT_SCREEN: NonNullable<Flags['screenEmulation']> = {
  width: 1920,
  height: 1080,
  mobile: false,
  deviceScaleFactor: 1,
  disabled: false,
};

/**
 * Performance Lighthouse test fixture.
 *
 * Extends Scout's lighthouseTest (which provides browserAuth, page, kbnUrl,
 * persistent context, debugging port, etc.) with a custom `lighthouse` fixture
 * that calls the `lighthouse` npm module directly with full `Flags` support
 * (throttlingMethod, throttling, onlyCategories, etc.).
 *
 * The original kbn-scout lighthouse fixture is overridden — our version supports
 * the full Lighthouse config surface area needed for performance benchmarking.
 */
export const perfLighthouseTest = lighthouseTest.extend<{
  lighthouse: PerfLighthouseFixture;
}>({
  lighthouse: [
    async ({ log, debuggingPort }, use, testInfo) => {
      const lh = (await import('lighthouse')).default;

      if (!debuggingPort) {
        throw new Error(
          `Remote debugging port is not set: Check 'use.launchOptions.args' in Playwright configuration`
        );
      }

      const runAudit = async (
        url: string,
        options?: PerfLighthouseAuditOptions
      ): Promise<RunnerResult> => {
        const flags: Flags = {
          port: debuggingPort,
          maxWaitForLoad: options?.maxWaitForLoad ?? 30000,
          output: ['html'],
          formFactor: 'desktop',
          throttlingMethod: options?.throttlingMethod ?? 'provided',
          screenEmulation: {
            ...DEFAULT_SCREEN,
            ...(options?.screenEmulation && {
              width: options.screenEmulation.width,
              height: options.screenEmulation.height,
            }),
          },
        };

        if (options?.throttling) {
          flags.throttling = options.throttling;
        }

        if (options?.onlyCategories) {
          flags.onlyCategories = options.onlyCategories;
        }

        const auditResult = await lh(url, flags);

        if (!auditResult?.lhr?.categories?.performance?.score) {
          throw new Error('Lighthouse audit failed: No performance score found');
        }

        const perfScore = auditResult.lhr.categories.performance.score;
        log.info(`Lighthouse audit completed with performance score: ${perfScore}`);

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
