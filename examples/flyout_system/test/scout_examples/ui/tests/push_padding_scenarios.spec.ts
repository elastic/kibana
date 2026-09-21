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

const EUI_PUSH_PADDING_FIX = 'https://github.com/elastic/eui/pull/10063';
const EUI_BACKGROUNDED_MAIN_FIX = 'https://github.com/elastic/eui/pull/10062';
const NO_PADDING = '(none)';

/**
 * Scenarios that fail on Kibana main are skipped statically so the Scout manifest records them
 * as `skipped`. Remove the skip once the linked EUI fix ships in Kibana.
 */
const failsOnMain = (reason: string, fix: string) => ({
  annotation: { type: 'skip', description: `Fails on Kibana main: ${reason} Fixed by ${fix}.` },
});

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

    // eslint-disable-next-line playwright/no-skipped-test -- fails until elastic/eui#10063 ships in Kibana
    test.skip(
      'two standalone push flyouts, close oldest first, returns to no padding (elastic/eui#9788)',
      failsOnMain(
        "A's padding is stranded after both flyouts close (elastic/eui#9788).",
        EUI_PUSH_PADDING_FIX
      ),
      async ({ page }) => {
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
      }
    );

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

    // eslint-disable-next-line playwright/no-skipped-test -- fails until elastic/eui#10063 ships in Kibana
    test.skip(
      'standalone push + system push, close standalone first, keeps the system flyout pushed',
      failsOnMain(
        'closing A drops the padding to (none) while C is still active.',
        EUI_PUSH_PADDING_FIX
      ),
      async ({ page }) => {
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
      }
    );

    // eslint-disable-next-line playwright/no-skipped-test -- fails until elastic/eui#10063 ships in Kibana
    test.skip(
      'standalone push under a system overlay keeps its padding when the overlay closes',
      failsOnMain(
        "the resetPushOffsetIfIdle workaround in system_flyout_service.tsx strips A's padding once no system flyout remains. Needs the workaround removed after",
        EUI_PUSH_PADDING_FIX
      ),
      async ({ page }) => {
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
      }
    );

    // eslint-disable-next-line playwright/no-skipped-test -- fails until elastic/eui#10063 ships in Kibana
    test.skip(
      'resizing a standalone push flyout behind an active system push flyout keeps following the active one',
      failsOnMain(
        "the padding jumps to A's width and closing A afterwards leaves C unpushed.",
        EUI_PUSH_PADDING_FIX
      ),
      async ({ page }) => {
        await toggle(page, 'Standalone A').click();
        await expect(standaloneFlyout(page, 'Standalone A')).toBeVisible();
        await toggle(page, 'System push C').click();
        await expect(systemFlyout(page, 'System push C')).toBeVisible();
        await expect(containerPadding(page)).not.toHaveText(NO_PADDING);
        const pushedPadding = await page.testSubj.innerText('pushPaddingContainerValue');

        // Keyboard resize (10px per key press) works while A sits behind C, unlike a mouse drag.
        const resizeHandle = standaloneFlyout(page, 'Standalone A').locator(
          '[data-test-subj="euiResizableButton"]'
        );
        await resizeHandle.focus();
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('ArrowLeft');
        }
        await expect(containerPadding(page)).toHaveText(pushedPadding);

        await toggle(page, 'Standalone A').click();
        await expect(standaloneFlyout(page, 'Standalone A')).toHaveCount(0);
        await expect(containerPadding(page)).toHaveText(pushedPadding);

        await toggle(page, 'System push C').click();
        await expect(containerPadding(page)).toHaveText(NO_PADDING);
      }
    );

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

    test('two system push sessions, Back from the newest, ends with no padding', async ({
      page,
    }) => {
      await toggle(page, 'System push C').click();
      await expect(systemFlyout(page, 'System push C')).toBeVisible();
      await toggle(page, 'System push D').click();
      const flyoutD = systemFlyout(page, 'System push D');
      await expect(flyoutD).toBeVisible();

      // Back routes through the template's onClose, unlike the page toggle which calls ref.close().
      await flyoutD.getByRole('button', { name: 'Back' }).click();
      await expect(flyoutD).toHaveCount(0);
      await expect(systemFlyout(page, 'System push C')).toBeVisible();
      await expect(containerPadding(page)).not.toHaveText(NO_PADDING);

      await toggle(page, 'System push C').click();
      await expect(systemFlyout(page, 'System push C')).toHaveCount(0);
      await expect(containerPadding(page)).toHaveText(NO_PADDING);
      await expect(strandedBadge(page)).toHaveCount(0);
    });

    // eslint-disable-next-line playwright/no-skipped-test -- fails until elastic/eui#10062 ships in Kibana
    test.skip(
      'two system push sessions, close oldest first, keeps the newest open',
      failsOnMain(
        'closing a backgrounded main closes the foreground session instead, so D disappears (elastic/eui#10061).',
        EUI_BACKGROUNDED_MAIN_FIX
      ),
      async ({ page }) => {
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
      }
    );
  }
);
