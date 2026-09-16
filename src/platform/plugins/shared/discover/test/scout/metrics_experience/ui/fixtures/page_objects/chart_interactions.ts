/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export interface ChartInteractions {
  /**
   * Waits for the embeddable panel inside a card to signal that rendering is
   * complete via the `data-render-complete="true"` attribute set by Lens.
   *
   * Uses polling to verify the attribute stays `"true"` for a minimum
   * duration, guarding against transient flips that can occur when Lens
   * re-renders (e.g. after a brush action). This mirrors the
   * approach used by `DiscoverApp.waitForDocTableRendered`.
   */
  waitForCardRenderComplete: (index: number) => Promise<void>;

  /**
   * Performs a brush (click-and-drag) gesture on the chart canvas within a
   * metric card. Drags from ~25% to ~75% of the canvas width horizontally.
   */
  brushChartInCard: (index: number) => Promise<void>;
}

export function createChartInteractions(
  page: ScoutPage,
  getCardByIndex: (index: number) => Locator
): ChartInteractions {
  const getChartCanvasForCard = (index: number): Locator => {
    return getCardByIndex(index).locator('canvas');
  };

  return {
    waitForCardRenderComplete: async (index: number): Promise<void> => {
      const panel = getCardByIndex(index).locator('[data-test-subj="embeddablePanel"]');
      await expect(panel).toBeVisible();

      const minDurationMs = 2_000;
      const pollIntervalMs = 100;
      const totalTimeoutMs = 30_000;

      let stableSince: number | null = null;

      await expect
        .poll(
          async () => {
            const attr = await panel.getAttribute('data-render-complete');
            const now = Date.now();

            if (attr === 'true') {
              if (!stableSince) {
                stableSince = now;
              }
              return now - stableSince >= minDurationMs;
            }
            // Reset if it flips away from 'true'
            stableSince = null;
            return false;
          },
          {
            message: `data-render-complete on card ${index} did not stay 'true' for ${minDurationMs}ms`,
            timeout: totalTimeoutMs,
            intervals: [pollIntervalMs],
          }
        )
        .toBe(true);
    },

    brushChartInCard: async (index: number): Promise<void> => {
      const canvas = getChartCanvasForCard(index);
      await canvas.waitFor({ state: 'visible' });
      const box = await canvas.boundingBox();
      if (!box) {
        throw new Error(`Could not get bounding box for chart canvas in card ${index}`);
      }
      const y = box.y + box.height / 2;
      const startX = box.x + box.width * 0.25;
      const endX = box.x + box.width * 0.75;

      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(endX, y, { steps: 10 });
      await page.mouse.up();
    },
  };
}
