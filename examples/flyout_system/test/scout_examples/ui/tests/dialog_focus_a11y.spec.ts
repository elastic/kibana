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

/** Test open/close focus behavior for both component and service forms. */
test.describe('Flyout System - dialog focus accessibility', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.flyoutSystem.goto();
  });

  for (const form of FORMS) {
    // Test with ownFocus enabled and disabled.
    for (const ownFocus of [false, true]) {
      test(`opening a ${form} flyout moves focus into the dialog with ownFocus ${ownFocus}`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);

        if (ownFocus) {
          await app.ownFocusSwitch(session).click();
        }

        const flyout = await app.openFlyout(form, session);
        await expect
          .poll(async () => app.isFocusWithin(flyout), {
            message: 'focus should land inside the flyout once it opens',
          })
          .toBe(true);
      });
    }

    test(`closing a ${form} flyout returns focus to its trigger`, async ({ page, pageObjects }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session(form);
      const trigger = app.trigger(form, session);

      await test.step('close by the footer action', async () => {
        const flyout = await app.openFlyout(form, session);
        await app.footerCloseAction(form, session).click();
        await expect(flyout).toHaveCount(0);
        await expect(trigger).toBeFocused();
      });

      await test.step('close by the flyout close button', async () => {
        const flyout = await app.openFlyout(form, session);
        await app.closeButton(form, session).click();
        await expect(flyout).toHaveCount(0);
        await expect(trigger).toBeFocused();
      });

      await test.step('close by Escape', async () => {
        const flyout = await app.openFlyout(form, session);
        await page.keyboard.press('Escape');
        await expect(flyout).toHaveCount(0);
        await expect(trigger).toBeFocused();
      });
    });

    test(`closing a ${form} child flyout returns focus to the control that opened it`, async ({
      pageObjects,
    }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session(form);
      await app.openFlyout(form, session);

      const childTrigger = app.childTrigger(form, session, 'A');
      await expect(childTrigger).toBeVisible();

      const child = await app.openChildFlyout(form, session, 'A');
      await app.childCloseButton(form, session, 'A').click();

      await expect(child).toHaveCount(0);
      await expect(childTrigger).toBeFocused();
    });
  }
});
