/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import type { FlyoutForm } from '../fixtures';

const FORMS: FlyoutForm[] = ['component', 'service'];

/** EUI moves the edge by 10px per arrow press (`KEYBOARD_OFFSET`). */
const KEYBOARD_OFFSET = 10;

/** `minWidth` both widgets pass to the template. */
const FLYOUT_MIN_WIDTH = 300;

/** Tab stops between the close button and the resize handle; small so a miss fails fast. */
const MAX_TAB_STOPS = 10;

test.describe(
  'Flyout System - resizable flyout accessibility',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.flyoutSystem.goto();
    });

    test('resize handle is reachable by keyboard and resizes the flyout', async ({
      page,
      pageObjects,
    }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      const flyout = await app.openFlyout('component', session);

      const before = await flyout.boundingBox();
      expect(before).not.toBeNull();
      const startWidth = before?.width ?? 0;

      // Start from inside the dialog: the handle sits right after the close button in DOM order.
      await app.closeButton('component', session).focus();
      await page.keyTo(app.resizeHandleSelector('component', session), 'Tab', MAX_TAB_STOPS);
      await expect(app.resizeHandle('component', session)).toBeFocused();

      // Left arrow widens a right-aligned flyout.
      const presses = 5;
      for (let i = 0; i < presses; i++) {
        await page.keyboard.press('ArrowLeft');
      }

      await expect
        .poll(async () => (await flyout.boundingBox())?.width ?? 0)
        .toBeGreaterThan(startWidth + KEYBOARD_OFFSET * presses - KEYBOARD_OFFSET);

      const widened = (await flyout.boundingBox())?.width ?? 0;
      for (let i = 0; i < presses; i++) {
        await page.keyboard.press('ArrowRight');
      }
      await expect.poll(async () => (await flyout.boundingBox())?.width ?? 0).toBeLessThan(widened);
    });

    for (const form of FORMS) {
      test(`the ${form} resize handle names the keys that operate it`, async ({ pageObjects }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);

        // Check the accessible name of the resize handle.
        await expect(app.resizeHandle(form, session)).toHaveAccessibleName(/arrow keys/i);
      });
    }

    test('resizing honors the configured minimum width', async ({ page, pageObjects }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      const flyout = await app.openFlyout('component', session);

      await app.closeButton('component', session).focus();
      await page.keyTo(app.resizeHandleSelector('component', session), 'Tab', MAX_TAB_STOPS);

      // Shrink past the minimum width to test the clamp.
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press('ArrowRight');
      }

      const width = (await flyout.boundingBox())?.width ?? 0;
      // Account for 1px sub-pixel rounding.
      expect(width).toBeGreaterThanOrEqual(FLYOUT_MIN_WIDTH - 1);
    });

    test('a resized flyout keeps its dialog semantics', async ({ page, pageObjects }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      const flyout = await app.openFlyout('component', session);
      await expect(app.infoBlocks('component', session)).toBeVisible();

      await app.closeButton('component', session).focus();
      await page.keyTo(app.resizeHandleSelector('component', session), 'Tab', MAX_TAB_STOPS);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowLeft');
      }

      await expect(flyout).toHaveAccessibleName(session);

      const { violations } = await page.checkA11y({
        include: [app.rootSelector('component', session)],
      });
      expect(violations).toHaveLength(0);
    });
  }
);
