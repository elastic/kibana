/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, Page, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { SCOUT_VISUAL_REGRESSION_ENABLED } from '@kbn/scout-info';
import { waitForVisualStability } from './wait_for_visual_stability';

/**
 * Visual regression capture API.
 *
 * This API wraps the standard Playwright screenshot API to add metadata and
 * other Scout-specific checks (like waiting for network and page stability)
 * before capturing the screenshot.
 */
export interface VisualRegression {
  /**
   * Capture a default screenshot and attach it to the test result so the reporter can collect it.
   * @param name Logical name for the capture (required)
   * @param options Optional capture options
   */
  capture: (name: string) => Promise<void>;
  /**
   * Capture a full-page screenshot and attach it to the test result so the reporter can collect it.
   * @param name Logical name for the capture (required)
   * @param options Optional capture options
   */
  captureFull: (name: string) => Promise<void>;
  /**
   * Capture a screenshot of a specific locator and attach it.
   */
  captureLocator: (locator: Locator, name: string) => Promise<void>;
  /**
   * Convenience: capture the current viewport only (not full page).
   */
  captureViewport: (name: string) => Promise<void>;
}

export const createVisualRegressionApi = (page: Page, testInfo: TestInfo): VisualRegression => {
  const isEnabled = SCOUT_VISUAL_REGRESSION_ENABLED === true;

  const getFilePath = (name: string) => testInfo.outputPath(`vrt-${Date.now()}-${name}.png`);

  const parseCallsite = (): { file?: string; line?: number; column?: number } => {
    // Prefer Playwright-provided location when available
    try {
      const testFile = (testInfo as any).file as string | undefined;
      const testLine = (testInfo as any).line as number | undefined;
      const testColumn = (testInfo as any).column as number | undefined;
      if (testFile && typeof testLine === 'number') {
        const rel = path.relative(REPO_ROOT, testFile);
        return {
          file: !rel || rel.startsWith('..') ? testFile : rel,
          line: testLine,
          column: testColumn,
        };
      }
    } catch {
      // ignore
    }

    return {};
  };

  const captureScreenshot = async (
    name: string,
    takeScreenshot: (filePath: string) => Promise<void>
  ): Promise<void> => {
    if (!isEnabled) {
      return;
    }

    const filePath = getFilePath(name);

    await waitForVisualStability(page);
    await takeScreenshot(filePath);
    testInfo.attach(name, { path: filePath, contentType: 'image/png' });

    // Attach metadata sidecar for reporter to correlate and build GitHub links
    try {
      const metadataPath = filePath.replace(/\.png$/, '.json');
      const callsite = parseCallsite();
      const computeRunType = (mode: string | undefined): string => {
        if (!mode) return 'unknown';
        if (mode === 'stateful') return 'ess';
        const m = mode.match(/^serverless=(?<type>\w+)$/);
        return (m && (m.groups as { type?: string })?.type) || 'unknown';
      };

      const envMode = process.env.SCOUT_TARGET_MODE;
      const metadata = {
        captureName: name,
        source: callsite,
        testRun: {
          mode: envMode || 'unknown',
          type: computeRunType(envMode),
        },
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata));
      // Use a stable prefixed attachment name to correlate with the image capture name
      testInfo.attach(`vrt-metadata:${name}`, {
        path: metadataPath,
        contentType: 'application/json',
      });
    } catch {
      // best-effort: ignore metadata failures
    }
  };

  const captureFull = async (name: string) =>
    captureScreenshot(name, async (filePath) => {
      await page.screenshot({ fullPage: true, path: filePath });
    });

  const captureViewport = async (name: string) =>
    captureScreenshot(name, async (filePath) => {
      await page.screenshot({ fullPage: false, path: filePath });
    });

  const captureLocator = async (locator: Locator, name: string) => {
    await captureScreenshot(name, async (filePath) => {
      await locator.waitFor({ state: 'visible' });
      await locator.screenshot({ path: filePath });
    });
  };

  // The default capture method captures the viewport.  This makes changing it
  // easy, without requiring test changes.
  const capture = captureViewport;

  return { capture, captureFull, captureLocator, captureViewport };
};
