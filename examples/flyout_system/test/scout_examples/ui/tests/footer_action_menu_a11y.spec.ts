/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import type { FlyoutForm, FlyoutSystemApp } from '../fixtures';

const FORMS: FlyoutForm[] = ['component', 'service'];

/** Both widgets hang the menu off child flyout B, the only footer that carries one. */
test.describe(
  'Flyout System - footer action menu accessibility',
  { tag: ['@local-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.flyoutSystem.goto();
    });

    for (const form of FORMS) {
      /** Opens the child flyout that owns the menu and returns its trigger and panel. */
      const openMenuHost = async (app: FlyoutSystemApp) => {
        const session = app.session(form);
        await app.openFlyout(form, session);
        await expect(app.childTrigger(form, session, 'B')).toBeVisible();
        await app.openChildFlyout(form, session, 'B');

        const trigger = app.childFooterMenuTrigger(form, session);
        await expect(trigger).toBeVisible();
        return { session, trigger, panel: app.childFooterMenuPanel(form, session) };
      };

      test(`the ${form} footer action menu trigger names itself and declares its popup`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const { trigger, panel } = await openMenuHost(app);

        await expect(trigger).toHaveAccessibleName('Take action');
        await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');

        // Nothing is announced until the trigger is used.
        await expect(panel).toHaveCount(0);
      });

      test(`the ${form} footer action menu opens from the keyboard and exposes its items`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const { trigger, panel } = await openMenuHost(app);

        await trigger.focus();
        await expect(trigger).toBeFocused();
        await trigger.press('Enter');

        await expect(panel).toBeVisible();
        await expect(panel.getByRole('menuitem', { name: 'Add to case' })).toBeVisible();
        await expect(panel.getByRole('menuitem', { name: 'Export as PDF' })).toBeVisible();

        // Focus follows the menu, so it is operable without a pointer.
        await expect
          .poll(async () => app.isFocusWithin(panel), {
            message: 'focus should move into the menu when it opens',
          })
          .toBe(true);
      });

      test(`Escape dismisses the ${form} footer action menu and leaves the flyout open`, async ({
        page,
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const { session, trigger, panel } = await openMenuHost(app);

        await trigger.focus();
        await trigger.press('Enter');
        await expect(panel).toBeVisible();
        // The popover focuses its own panel first, then EuiContextMenu moves focus into its inner
        // panel. An Escape between the two lets that deferred focus pull focus off the trigger.
        await expect
          .poll(async () => app.isFocusWithin(app.childFooterMenuActionsPanel(form, session)), {
            message: 'focus should move into the menu before Escape is pressed',
          })
          .toBe(true);

        await page.keyboard.press('Escape');

        // Escape belongs to the topmost layer only; the flyout underneath must survive it.
        await expect(panel).toBeHidden();
        await expect(app.childFlyout(form, session, 'B')).toBeVisible();
        await expect(trigger).toBeFocused();
      });

      test(`the ${form} footer action menu back button returns to the first panel`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const { trigger, panel } = await openMenuHost(app);

        await trigger.click();
        await panel.getByRole('menuitem', { name: 'More actions' }).click();
        await expect(panel.getByRole('menuitem', { name: 'Archive' })).toBeVisible();

        // Without a panel title EUI renders no back button, stranding keyboard users.
        const back = panel.getByRole('button', { name: /close current panel/i });
        await expect(back).toBeVisible();

        await back.click();
        await expect(panel.getByRole('menuitem', { name: 'Add to case' })).toBeVisible();
      });

      test(`the open ${form} footer action menu has no accessibility violations`, async ({
        page,
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const { session, trigger, panel } = await openMenuHost(app);

        await trigger.click();
        await expect(panel.getByRole('menuitem', { name: 'Add to case' })).toBeVisible();

        const { violations } = await page.checkA11y({
          include: [
            app.childRootSelector(form, session, 'B'),
            app.childFooterMenuPanelSelector(form, session),
          ],
        });
        expect(violations).toHaveLength(0);
      });
    }
  }
);
