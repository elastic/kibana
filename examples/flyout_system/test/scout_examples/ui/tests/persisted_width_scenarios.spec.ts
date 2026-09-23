/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const NO_WIDTH = '(none)';

const toggle = (page: ScoutPage, label: string) =>
  page.testSubj.locator(`persistedWidthToggle-${label}`);
const systemFlyout = (page: ScoutPage, label: string) =>
  page.locator(`[id="persistedWidthFlyout-${label.replace(/\s+/g, '-')}"]`);
const renderedWidth = (page: ScoutPage, label: string) =>
  page.testSubj.locator(`persistedWidthRendered-${label.replace(/\s+/g, '-')}`);
const storedWidth = (page: ScoutPage) => page.testSubj.locator('persistedWidthStoredValue');

test.describe(
  'Flyout System - persisted width scenarios',
  { tag: ['@local-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsViewer();
      await page.gotoApp('flyoutSystemExamples');
      await expect(toggle(page, 'Persisted push P')).toBeVisible();
      await expect(storedWidth(page)).toHaveText(NO_WIDTH);
    });

    test('second system push flyout opens at the width stored by resizing the first', async ({
      page,
    }) => {
      await toggle(page, 'Persisted push P').click();
      const flyoutP = systemFlyout(page, 'Persisted push P');
      await expect(flyoutP).toBeVisible();
      await expect(renderedWidth(page, 'Persisted push P')).toContainText('px');

      // Drag P's left edge to roughly 70% of the viewport. The clamp only bites once P is wider
      // than the space EUI leaves next to a sibling (90% of the viewport minus P's width).
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      const handle = flyoutP.locator('[data-test-subj="euiResizableButton"]');
      const handleBox = await handle.boundingBox();
      if (!handleBox) throw new Error('Resize handle of Persisted push P is not rendered');
      const handleY = handleBox.y + handleBox.height / 2;
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleY);
      await page.mouse.down();
      await page.mouse.move(viewportWidth * 0.3, handleY, { steps: 10 });
      await page.mouse.up();

      await expect(storedWidth(page)).not.toHaveText(NO_WIDTH);
      const resizedWidth = await renderedWidth(page, 'Persisted push P').innerText();
      expect(parseInt(resizedWidth, 10)).toBeGreaterThan(viewportWidth * 0.45);

      await toggle(page, 'Persisted push Q').click();
      await expect(systemFlyout(page, 'Persisted push Q')).toBeVisible();
      await expect(renderedWidth(page, 'Persisted push Q')).toHaveText(resizedWidth);
    });
  }
);
