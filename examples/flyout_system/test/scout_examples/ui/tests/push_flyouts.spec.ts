/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/**
 * Regression tests for push flyout bugs fixed in EUI, run against the "Push flyouts" section of
 * the example app. Tests are grouped by bug and prefixed with its issue.
 */

const NONE = '(none)';

const toggle = (page: ScoutPage, label: string) =>
  page.testSubj.locator(`pushFlyoutsToggle-${label}`);
const standalone = (page: ScoutPage, label: string) =>
  page.testSubj.locator(`pushFlyoutsStandalone-${label}`);
const system = (page: ScoutPage, label: string) =>
  page.locator(`[id="pushFlyoutsSystem-${label.replace(/\s+/g, '-')}"]`);
const pagePadding = (page: ScoutPage) => page.testSubj.locator('pushFlyoutsPagePadding');
const storedWidth = (page: ScoutPage) => page.testSubj.locator('pushFlyoutsStoredWidth');
const renderedWidth = (page: ScoutPage, label: string) =>
  page.testSubj.locator(`pushFlyoutsRenderedWidth-${label.replace(/\s+/g, '-')}`);

test.describe('Flyout System - push flyouts', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.flyoutSystem.goto();
    await expect(pagePadding(page)).toHaveText(NONE);
  });

  /**
   * https://github.com/elastic/eui/issues/9788, fixed by https://github.com/elastic/eui/pull/10063
   *
   * Push flyouts sharing a padding target each saved and restored the padding on their own, so
   * depending on the close order the page stayed pushed with nothing open, or lost its padding
   * while a push flyout was still open.
   */
  test('elastic/eui#9788: closing the older of two standalone push flyouts first leaves no padding behind', async ({
    page,
  }) => {
    await toggle(page, 'Standalone A').click();
    await expect(standalone(page, 'Standalone A')).toBeVisible();
    await toggle(page, 'Standalone B').click();
    await expect(standalone(page, 'Standalone B')).toBeVisible();

    await toggle(page, 'Standalone A').click();
    await expect(standalone(page, 'Standalone A')).toHaveCount(0);
    await expect(pagePadding(page)).not.toHaveText(NONE);

    await toggle(page, 'Standalone B').click();
    await expect(standalone(page, 'Standalone B')).toHaveCount(0);
    await expect(pagePadding(page)).toHaveText(NONE);
  });

  test('elastic/eui#9788: closing a standalone push flyout keeps the page pushed for an open system push flyout', async ({
    page,
  }) => {
    await toggle(page, 'Standalone A').click();
    await expect(standalone(page, 'Standalone A')).toBeVisible();
    await toggle(page, 'System push C').click();
    await expect(system(page, 'System push C')).toBeVisible();

    await toggle(page, 'Standalone A').click();
    await expect(standalone(page, 'Standalone A')).toHaveCount(0);
    await expect(system(page, 'System push C')).toBeVisible();
    await expect(pagePadding(page)).not.toHaveText(NONE);

    await toggle(page, 'System push C').click();
    await expect(pagePadding(page)).toHaveText(NONE);
  });

  // Also covers the removed core workaround (`resetPushOffsetIfIdle`), which cleared the padding
  // when the last system flyout closed even though a standalone push flyout was still open.
  test('elastic/eui#9788: closing a system overlay keeps the padding of a standalone push flyout under it', async ({
    page,
  }) => {
    await toggle(page, 'Standalone A').click();
    await expect(standalone(page, 'Standalone A')).toBeVisible();
    await expect(pagePadding(page)).not.toHaveText(NONE);
    const pushedPadding = await pagePadding(page).innerText();

    await toggle(page, 'System overlay E').click();
    const overlay = system(page, 'System overlay E');
    await expect(overlay).toBeVisible();
    await expect(pagePadding(page)).toHaveText(pushedPadding);

    // The overlay mask covers the page buttons, so close E from its own close button.
    await overlay.locator('[data-test-subj="euiFlyoutCloseButton"]').click();
    await expect(overlay).toHaveCount(0);
    await expect(standalone(page, 'Standalone A')).toBeVisible();
    await expect(pagePadding(page)).toHaveText(pushedPadding);

    await toggle(page, 'Standalone A').click();
    await expect(pagePadding(page)).toHaveText(NONE);
  });

  test('elastic/eui#9788: the padding follows the widest push flyout, including one resized in the background', async ({
    page,
  }) => {
    await toggle(page, 'Standalone A').click();
    await expect(standalone(page, 'Standalone A')).toBeVisible();
    await toggle(page, 'System push C').click();
    await expect(system(page, 'System push C')).toBeVisible();
    await expect(pagePadding(page)).not.toHaveText(NONE);
    const pushedPadding = await pagePadding(page).innerText();

    // A and C start at the same size. Keyboard resize (10px per press) works while A sits behind
    // C, unlike a mouse drag, and makes A the widest pushed flyout.
    await standalone(page, 'Standalone A').locator('[data-test-subj="euiResizableButton"]').focus();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await expect(pagePadding(page)).toHaveText(`${parseInt(pushedPadding, 10) + 50}px`);

    await toggle(page, 'Standalone A').click();
    await expect(standalone(page, 'Standalone A')).toHaveCount(0);
    await expect(pagePadding(page)).toHaveText(pushedPadding);

    await toggle(page, 'System push C').click();
    await expect(pagePadding(page)).toHaveText(NONE);
  });

  /**
   * https://github.com/elastic/eui/issues/10061, fixed by https://github.com/elastic/eui/pull/10062
   *
   * Closing the main flyout of a backgrounded session closed the foreground session instead.
   */
  test('elastic/eui#10061: closing the older of two system push flyouts keeps the newer one open', async ({
    page,
  }) => {
    await toggle(page, 'System push C').click();
    await expect(system(page, 'System push C')).toBeVisible();
    await toggle(page, 'System push D').click();
    await expect(system(page, 'System push D')).toBeVisible();

    await toggle(page, 'System push C').click();
    await expect(system(page, 'System push C')).toHaveCount(0);
    await expect(system(page, 'System push D')).toBeVisible();
    await expect(pagePadding(page)).not.toHaveText(NONE);

    await toggle(page, 'System push D').click();
    await expect(system(page, 'System push D')).toHaveCount(0);
    await expect(pagePadding(page)).toHaveText(NONE);
  });

  /**
   * https://github.com/elastic/eui/pull/10075
   *
   * A new system flyout was sized against the previous session's flyout as if they were side by
   * side, so a remembered width came back narrower, and alternated between two widths on every
   * open (seen in Security alert flyouts).
   */
  test('elastic/eui#10075: a second system push flyout opens at the width the first one was resized to', async ({
    page,
  }) => {
    await expect(storedWidth(page)).toHaveText(NONE);
    await toggle(page, 'System push C').click();
    const flyoutC = system(page, 'System push C');
    await expect(flyoutC).toBeVisible();
    await expect(renderedWidth(page, 'System push C')).toContainText('px');

    // Drag C to about 70% of the viewport. The bug only shows once C is wider than the space EUI
    // leaves next to a sibling (90% of the viewport minus C's width).
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const handleBox = await flyoutC.locator('[data-test-subj="euiResizableButton"]').boundingBox();
    if (!handleBox) throw new Error('Resize handle of System push C is not rendered');
    const handleY = handleBox.y + handleBox.height / 2;
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleY);
    await page.mouse.down();
    await page.mouse.move(viewportWidth * 0.3, handleY, { steps: 10 });
    await page.mouse.up();

    await expect(storedWidth(page)).not.toHaveText(NONE);
    const resizedWidth = await renderedWidth(page, 'System push C').innerText();
    expect(parseInt(resizedWidth, 10)).toBeGreaterThan(viewportWidth * 0.45);

    await toggle(page, 'System push D').click();
    await expect(system(page, 'System push D')).toBeVisible();
    await expect(renderedWidth(page, 'System push D')).toHaveText(resizedWidth);
  });
});
