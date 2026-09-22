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

const NO_PADDING = '(none)';

const toggle = (page: ScoutPage, label: string) =>
  page.testSubj.locator(`pushPaddingToggle-${label}`);
const standaloneFlyout = (page: ScoutPage, label: string) =>
  page.testSubj.locator(`pushPaddingFlyout-${label}`);
const systemFlyout = (page: ScoutPage, label: string) =>
  page.locator(`[id="pushPaddingSystemFlyout-${label.replace(/\s+/g, '-')}"]`);
const containerPadding = (page: ScoutPage) => page.testSubj.locator('pushPaddingContainerValue');
const strandedBadge = (page: ScoutPage) => page.testSubj.locator('pushPaddingStrandedBadge');

test.describe(
  'Flyout System - push padding scenarios',
  { tag: ['@local-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsViewer();
      await page.gotoApp('flyoutSystemExamples');
      await expect(toggle(page, 'Standalone A')).toBeVisible();
      await expect(containerPadding(page)).toHaveText(NO_PADDING);
    });

    test('two standalone push flyouts, close oldest first, returns to no padding (elastic/eui#9788)', async ({
      page,
    }) => {
      await toggle(page, 'Standalone A').click();
      await expect(standaloneFlyout(page, 'Standalone A')).toBeVisible();
      await toggle(page, 'Standalone B').click();
      await expect(standaloneFlyout(page, 'Standalone B')).toBeVisible();

      await toggle(page, 'Standalone A').click();
      await expect(standaloneFlyout(page, 'Standalone A')).toHaveCount(0);
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);

      await toggle(page, 'Standalone B').click();
      await expect(standaloneFlyout(page, 'Standalone B')).toHaveCount(0);
      await expect(containerPadding(page)).toHaveText(NO_PADDING);
      await expect(strandedBadge(page)).toHaveCount(0);
    });

    test('two standalone push flyouts, close newest first, keeps the older one pushed', async ({
      page,
    }) => {
      await toggle(page, 'Standalone A').click();
      await expect(standaloneFlyout(page, 'Standalone A')).toBeVisible();
      await expect(standaloneFlyout(page, 'Standalone A')).toHaveAccessibleName('Standalone A');
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);
      await toggle(page, 'Standalone B').click();
      await expect(standaloneFlyout(page, 'Standalone B')).toBeVisible();

      await toggle(page, 'Standalone B').click();
      await expect(standaloneFlyout(page, 'Standalone B')).toHaveCount(0);
      await expect(standaloneFlyout(page, 'Standalone A')).toBeVisible();
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);

      await toggle(page, 'Standalone A').click();
      await expect(containerPadding(page)).toHaveText(NO_PADDING);
      await expect(strandedBadge(page)).toHaveCount(0);
    });

    test('standalone push + system push, close standalone first, keeps the system flyout pushed', async ({
      page,
    }) => {
      await toggle(page, 'Standalone A').click();
      await expect(standaloneFlyout(page, 'Standalone A')).toBeVisible();
      await toggle(page, 'System push C').click();
      await expect(systemFlyout(page, 'System push C')).toBeVisible();
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);

      await toggle(page, 'Standalone A').click();
      await expect(standaloneFlyout(page, 'Standalone A')).toHaveCount(0);
      await expect(systemFlyout(page, 'System push C')).toBeVisible();
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);

      await toggle(page, 'System push C').click();
      await expect(systemFlyout(page, 'System push C')).toHaveCount(0);
      await expect(containerPadding(page)).toHaveText(NO_PADDING);
    });

    test('standalone push under a system overlay keeps its padding when the overlay closes', async ({
      page,
    }) => {
      await toggle(page, 'Standalone A').click();
      await expect(standaloneFlyout(page, 'Standalone A')).toBeVisible();
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);
      const pushedPadding = await page.testSubj.innerText('pushPaddingContainerValue');

      await toggle(page, 'System overlay E').click();
      const overlay = systemFlyout(page, 'System overlay E');
      await expect(overlay).toBeVisible();
      await expect(containerPadding(page)).toHaveText(pushedPadding);

      // The overlay mask covers the page buttons, so close E from its own close button.
      await overlay.locator('[data-test-subj="euiFlyoutCloseButton"]').click();
      await expect(overlay).toHaveCount(0);
      await expect(standaloneFlyout(page, 'Standalone A')).toBeVisible();
      await expect(containerPadding(page)).toHaveText(pushedPadding);

      await toggle(page, 'Standalone A').click();
      await expect(containerPadding(page)).toHaveText(NO_PADDING);
    });

    test('resizing a standalone push flyout behind an active system push flyout follows the widest one', async ({
      page,
    }) => {
      await toggle(page, 'Standalone A').click();
      await expect(standaloneFlyout(page, 'Standalone A')).toBeVisible();
      await toggle(page, 'System push C').click();
      await expect(systemFlyout(page, 'System push C')).toBeVisible();
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);
      const pushedPadding = await page.testSubj.innerText('pushPaddingContainerValue');

      // Keyboard resize (10px per key press) works while A sits behind C, unlike a mouse drag.
      // A and C start at the same size, so widening A makes it the widest pushed flyout and the
      // padding grows with it. Once A closes, the padding falls back to C.
      const resizeHandle = standaloneFlyout(page, 'Standalone A').locator(
        '[data-test-subj="euiResizableButton"]'
      );
      await resizeHandle.focus();
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowLeft');
      }
      await expect(containerPadding(page)).toHaveText(`${parseInt(pushedPadding, 10) + 50}px`);

      await toggle(page, 'Standalone A').click();
      await expect(standaloneFlyout(page, 'Standalone A')).toHaveCount(0);
      await expect(containerPadding(page)).toHaveText(pushedPadding);

      await toggle(page, 'System push C').click();
      await expect(containerPadding(page)).toHaveText(NO_PADDING);
    });

    test('two system push sessions, close newest first, ends with no padding', async ({ page }) => {
      await toggle(page, 'System push C').click();
      await expect(systemFlyout(page, 'System push C')).toBeVisible();
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);
      await toggle(page, 'System push D').click();
      await expect(systemFlyout(page, 'System push D')).toBeVisible();

      await toggle(page, 'System push D').click();
      await expect(systemFlyout(page, 'System push D')).toHaveCount(0);
      await expect(systemFlyout(page, 'System push C')).toBeVisible();
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);

      await toggle(page, 'System push C').click();
      await expect(systemFlyout(page, 'System push C')).toHaveCount(0);
      await expect(containerPadding(page)).toHaveText(NO_PADDING);
      await expect(strandedBadge(page)).toHaveCount(0);
    });

    test('two system push sessions, close oldest first, keeps the newest open', async ({
      page,
    }) => {
      await toggle(page, 'System push C').click();
      await expect(systemFlyout(page, 'System push C')).toBeVisible();
      await toggle(page, 'System push D').click();
      await expect(systemFlyout(page, 'System push D')).toBeVisible();

      await toggle(page, 'System push C').click();
      await expect(systemFlyout(page, 'System push C')).toHaveCount(0);
      await expect(systemFlyout(page, 'System push D')).toBeVisible();
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);

      await toggle(page, 'System push D').click();
      await expect(systemFlyout(page, 'System push D')).toHaveCount(0);
      await expect(containerPadding(page)).toHaveText(NO_PADDING);
    });
  }
);
