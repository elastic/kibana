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

    for (const form of FORMS) {
      test(`the ${form} header collapses when the body is scrolled with the keyboard`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);
        await expect(app.infoBlocks(form, session)).toBeVisible();

        const region = app.collapsibleRegion(form, session);
        await expect(region).not.toHaveAttribute('aria-hidden', 'true');

        // EUI's body overflow container has tabIndex={0}, making it reachable via keyboard.
        await app.scrollBodyByKeyboard(form, session, 'PageDown');
        await expect(region).toHaveAttribute('aria-hidden', 'true');

        await app.scrollBodyByKeyboard(form, session, 'Home');
        await expect(region).not.toHaveAttribute('aria-hidden', 'true');
      });

      test(`the ${form} flyout stays named while the header is collapsed`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        const flyout = await app.openFlyout(form, session);
        await expect(app.infoBlocks(form, session)).toBeVisible();

        await app.scrollBodyByKeyboard(form, session, 'PageDown');
        await expect(app.collapsibleRegion(form, session)).toHaveAttribute('aria-hidden', 'true');

        // The compact heading is a different element carrying the same generated id.
        await expect(flyout).toHaveAccessibleName(session);
      });

      test(`the ${form} title tooltip stays available while the header is collapsed`, async ({
        page,
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);

        const icon = app.titleIcon(form, session);
        await expect(icon).toBeVisible();

        await app.scrollBodyByKeyboard(form, session, 'PageDown');
        await expect(app.collapsibleRegion(form, session)).toHaveAttribute('aria-hidden', 'true');

        // The compact title row carries the icon, so the only route to this content survives collapse.
        await expect(icon).toBeVisible();
        const anchor = icon.locator('[tabindex="0"]');
        await anchor.focus();
        await expect(anchor).toBeFocused();
        await expect(page.getByRole('tooltip')).toContainText(
          'This flyout demonstrates the flyout template.'
        );
      });

      test(`the collapsed ${form} header content leaves the tab order`, async ({
        page,
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);

        const overflow = app.badgeOverflow(form, session);
        const link = app.metaBlockLink(form, session);
        await expect(overflow).toBeVisible();

        await app.scrollBodyByKeyboard(form, session, 'PageDown');
        const region = app.collapsibleRegion(form, session);
        await expect(region).toHaveAttribute('aria-hidden', 'true');

        // Wait for the transition to complete so visibility: hidden removes elements from the tab order.
        await expect(overflow).toBeHidden();
        await expect(link).toBeHidden();

        // Sweep the dialog to ensure no focus stops in the hidden region.
        const closeButton = app.closeButton(form, session);
        await closeButton.focus();
        for (let i = 0; i < TAB_SWEEP_STOPS; i++) {
          await page.keyboard.press('Tab');
          expect(await app.isFocusWithin(region)).toBe(false);
        }
      });

      test(`the ${form} header does not strand focus when it collapses`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        const flyout = await app.openFlyout(form, session);

        // Focus an element in the collapsible region before scrolling.
        const overflow = app.badgeOverflow(form, session);
        await overflow.focus();
        await expect(overflow).toBeFocused();

        await app.wheelOverHeader(form, session, WHEEL_DELTA);
        const region = app.collapsibleRegion(form, session);
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

      test(`collapsing the ${form} header dismisses the badge overflow popover`, async ({
        page,
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        const flyout = await app.openFlyout(form, session);

        const overflow = app.badgeOverflow(form, session);
        await overflow.click();
        const popover = page.getByRole('dialog', { name: 'Show 2 more badges' });
        await expect(popover).toBeVisible();

        await app.wheelOverHeader(form, session, WHEEL_DELTA);
        await expect(app.collapsibleRegion(form, session)).toHaveAttribute('aria-hidden', 'true');

        // The panel is portalled, so nothing else would take it down once its anchor goes inert,
        // leaving the badges floating over a control that is no longer there.
        await expect(popover).toBeHidden();
        expect(await app.isFocusWithin(flyout)).toBe(true);
      });

      test(`the ${form} header keeps aria-hidden and focusability in agreement during the collapse animation`, async ({
        page,
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);
        await expect(app.infoBlocks(form, session)).toBeVisible();

        const region = app.collapsibleRegion(form, session);
        const closeButton = app.closeButton(form, session);
        await closeButton.focus();

        // Sweep focus mid-transition to ensure aria-hidden and focusability agree.
        await app.wheelOverHeader(form, session, WHEEL_DELTA);
        await expect(region).toHaveAttribute('aria-hidden', 'true');

        for (let i = 0; i < TAB_SWEEP_STOPS; i++) {
          await page.keyboard.press('Tab');
          expect(await app.isFocusWithin(region)).toBe(false);
        }
      });

      test(`a scroll-collapsed ${form} header has no accessibility violations`, async ({
        page,
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);
        await expect(app.infoBlocks(form, session)).toBeVisible();

        await app.scrollBodyByKeyboard(form, session, 'PageDown');
        const region = app.collapsibleRegion(form, session);
        await expect(region).toHaveAttribute('aria-hidden', 'true');
        await expect(region).toHaveAttribute('inert');

        const { violations } = await page.checkA11y({
          include: [app.rootSelector(form, session)],
        });
        expect(violations).toHaveLength(0);
      });

      test(`the ${form} header swallows the wheel when nothing in the flyout can scroll`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);
        await expect(app.childTrigger(form, session, 'A')).toBeVisible();
        const child = await app.openChildFlyout(form, session, 'A');

        const result = await child.evaluate((el, headerSelector) => {
          const body = el.querySelector('[data-test-subj="euiFlyoutBodyOverflow"]') as HTMLElement;
          const content = el.querySelector('[data-test-subj="euiFlyoutContent"]') as HTMLElement;
          const header = el.querySelector(headerSelector) as HTMLElement;
          const event = new WheelEvent('wheel', { deltaY: 50, cancelable: true, bubbles: true });
          header.dispatchEvent(event);
          return {
            bodyScrolls: body.scrollHeight > body.clientHeight,
            contentScrolls: content.scrollHeight > content.clientHeight,
            defaultPrevented: event.defaultPrevented,
          };
        }, app.childHeaderSelector(form, session, 'A'));

        // The swallow path only exists when neither scroller has anywhere left to go.
        expect(result.bodyScrolls).toBe(false);
        expect(result.contentScrolls).toBe(false);

        // Releasing here would chain the scroll out to the page behind the flyout.
        expect(result.defaultPrevented).toBe(true);
      });

      test(`the ${form} footer stays reachable by wheel at a reflow viewport`, async ({
        page,
        pageObjects,
      }) => {
        // 1280x1024 at 400% zoom, the WCAG 1.4.10 reflow reference.
        await page.setViewportSize({ width: 320, height: 256 });

        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);

        const save = app.footerSaveAction(form, session);

        // Scroll until the footer becomes visible.
        for (let i = 0; i < 12; i++) {
          await app.wheelOverHeader(form, session, WHEEL_DELTA);
        }

        await expect(save).toBeInViewport();
      });

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

    // Only the service widget renders tabs.
    test('the tab bar stays pinned and operable while the header is collapsed', async ({
      pageObjects,
    }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('service');
      await app.openFlyout('service', session);
      await expect(app.infoBlocks('service', session)).toBeVisible();

      await app.scrollBodyByKeyboard('service', session, 'PageDown');
      await expect(app.collapsibleRegion('service', session)).toHaveAttribute(
        'aria-hidden',
        'true'
      );

      // The tab bar sits in the header's always-visible region, so collapse must not take it away.
      await expect(app.tabList('service', session)).toBeVisible();

      const overview = app.tab('service', session, 'Overview');
      const activity = app.tab('service', session, 'Activity');
      await overview.focus();
      await overview.press('ArrowRight');
      await expect(activity).toBeFocused();

      await activity.press('Enter');
      await expect(activity).toHaveAttribute('aria-selected', 'true');
      await expect(overview).toHaveAttribute('aria-selected', 'false');
    });
  }
);
