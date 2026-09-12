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

/** Wheel delta large enough to clear the 16px collapse threshold in one turn. */
const WHEEL_DELTA = 400;

/** Number of Tab presses to cycle the focus trap. */
const TAB_SWEEP_STOPS = 15;

/** Test collapse-on-scroll using real user inputs (keyboard/wheel). */
test.describe(
  'Flyout System - header collapse accessibility',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.flyoutSystem.goto();
    });

    test('collapses when the body is scrolled with the keyboard', async ({ pageObjects }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      await app.openFlyout('component', session);
      await expect(app.infoBlocks('component', session)).toBeVisible();

      const region = app.collapsibleRegion('component', session);
      await expect(region).not.toHaveAttribute('aria-hidden', 'true');

      // EUI's body overflow container has tabIndex={0}, making it reachable via keyboard.
      await app.scrollBodyByKeyboard('component', session, 'PageDown');
      await expect(region).toHaveAttribute('aria-hidden', 'true');

      await app.scrollBodyByKeyboard('component', session, 'Home');
      await expect(region).not.toHaveAttribute('aria-hidden', 'true');
    });

    test('keeps the flyout named while the header is collapsed', async ({ pageObjects }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      const flyout = await app.openFlyout('component', session);
      await expect(app.infoBlocks('component', session)).toBeVisible();

      await app.scrollBodyByKeyboard('component', session, 'PageDown');
      await expect(app.collapsibleRegion('component', session)).toHaveAttribute(
        'aria-hidden',
        'true'
      );

      // The compact heading is a different element carrying the same generated id.
      await expect(flyout).toHaveAccessibleName(session);
    });

    test('takes the collapsed header content out of the tab order', async ({
      page,
      pageObjects,
    }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      await app.openFlyout('component', session);

      const overflow = app.badgeOverflow('component', session);
      const link = app.metaBlockLink('component', session);
      await expect(overflow).toBeVisible();

      await app.scrollBodyByKeyboard('component', session, 'PageDown');
      const region = app.collapsibleRegion('component', session);
      await expect(region).toHaveAttribute('aria-hidden', 'true');

      // Wait for the transition to complete so visibility: hidden removes elements from the tab order.
      await expect(overflow).toBeHidden();
      await expect(link).toBeHidden();

      // Sweep the dialog to ensure no focus stops in the hidden region.
      const closeButton = app.closeButton('component', session);
      await closeButton.focus();
      for (let i = 0; i < TAB_SWEEP_STOPS; i++) {
        await page.keyboard.press('Tab');
        expect(await app.isFocusWithin(region)).toBe(false);
      }
    });

    test('does not strand focus inside the header when it collapses', async ({ pageObjects }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      const flyout = await app.openFlyout('component', session);

      // Focus an element in the collapsible region before scrolling.
      const overflow = app.badgeOverflow('component', session);
      await overflow.focus();
      await expect(overflow).toBeFocused();

      await app.wheelOverHeader('component', session, WHEEL_DELTA);
      const region = app.collapsibleRegion('component', session);
      await expect(region).toHaveAttribute('aria-hidden', 'true');
      await expect(overflow).toBeHidden();

      // Ensure focus moves out of the hidden region but stays in the dialog.
      await expect
        .poll(async () => app.isFocusWithin(region), {
          message: 'focus should not remain inside the collapsed header region',
        })
        .toBe(false);
      expect(await app.isFocusWithin(flyout)).toBe(true);
    });

    test('keeps aria-hidden and focusability in agreement during the collapse animation', async ({
      page,
      pageObjects,
    }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      await app.openFlyout('component', session);
      await expect(app.infoBlocks('component', session)).toBeVisible();

      const region = app.collapsibleRegion('component', session);
      const closeButton = app.closeButton('component', session);
      await closeButton.focus();

      // Sweep focus mid-transition to ensure aria-hidden and focusability agree.
      await app.wheelOverHeader('component', session, WHEEL_DELTA);
      await expect(region).toHaveAttribute('aria-hidden', 'true');

      for (let i = 0; i < TAB_SWEEP_STOPS; i++) {
        await page.keyboard.press('Tab');
        expect(await app.isFocusWithin(region)).toBe(false);
      }
    });

    test('keeps the footer reachable by wheel at a reflow viewport', async ({
      page,
      pageObjects,
    }) => {
      // Use a 640x360 viewport to simulate 400% zoom (WCAG 1.4.10 reflow target).
      await page.setViewportSize({ width: 640, height: 360 });

      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      await app.openFlyout('component', session);

      const save = app.footerSaveAction('component', session);

      // Scroll until the footer becomes visible.
      for (let i = 0; i < 12; i++) {
        await app.wheelOverHeader('component', session, WHEEL_DELTA);
      }

      await expect(save).toBeInViewport();
    });

    for (const form of FORMS) {
      test(`a permanently collapsed ${form} child header still names its dialog`, async ({
        page,
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);

        // Ensure the trigger is visible before interacting with it.
        await expect(app.childTrigger(form, session, 'A')).toBeVisible();
        const child = await app.openChildFlyout(form, session, 'A');

        // The region is hidden from the start because `<Header collapsed />` is used.
        await expect(app.childCollapsibleRegion(form, session, 'A')).toHaveAttribute(
          'aria-hidden',
          'true'
        );
        await expect(child).toHaveAccessibleName(app.childTitle(form, session, 'A'));

        const { violations } = await page.checkA11y({
          include: [app.childRootSelector(form, session, 'A')],
        });
        expect(violations).toHaveLength(0);
      });
    }
  }
);
