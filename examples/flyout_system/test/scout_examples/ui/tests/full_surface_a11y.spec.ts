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
import type { FlyoutForm } from '../fixtures';

const FORMS: FlyoutForm[] = ['component', 'service'];

test.describe(
  'Flyout System - full surface accessibility',
  { tag: ['@local-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.flyoutSystem.goto();
    });

    test('a component-composed full surface flyout has no accessibility violations', async ({
      page,
      pageObjects,
    }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      await app.openFlyout('component', session);

      // Wait for header blocks and body banner to render before testing.
      await expect(app.infoBlocks('component', session)).toBeVisible();
      await expect(app.badgeOverflow('component', session)).toBeVisible();
      await expect(app.bodyBanner('component', session)).toBeVisible();

      const { violations } = await page.checkA11y({
        include: [app.rootSelector('component', session)],
      });
      expect(violations).toHaveLength(0);
    });

    test('a service-opened accordion and tabbed flyout has no accessibility violations', async ({
      page,
      pageObjects,
    }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('service');
      const flyout = await app.openFlyout('service', session);

      await expect(app.infoBlocks('service', session)).toBeVisible();
      await expect(flyout.getByRole('tablist')).toBeVisible();
      await expect(app.bodyBanner('service', session)).toBeVisible();

      const { violations } = await page.checkA11y({
        include: [app.rootSelector('service', session)],
      });
      expect(violations).toHaveLength(0);
    });

    for (const form of FORMS) {
      test(`the ${form} flyout dialog is named by its header title`, async ({ pageObjects }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        const flyout = await app.openFlyout(form, session);

        await expect(flyout).toHaveRole('dialog');
        await expect(flyout).toHaveAccessibleName(session);
      });
    }

    for (const form of FORMS) {
      test(`${form} body callouts stack in the banner and stay out of the heading outline`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        const flyout = await app.openFlyout(form, session);

        const disabled = app.bodyCallout(form, session, 'Disabled');
        const failures = app.bodyCallout(form, session, 'Failures');
        await expect(disabled).toBeVisible();
        await expect(failures).toBeVisible();
        await expect(disabled).toContainText('Rule is disabled');
        await expect(failures).toContainText('3 actions failed');

        // Source order is preserved: the warning renders above the danger callout.
        const disabledBox = await disabled.boundingBox();
        const failuresBox = await failures.boundingBox();
        expect(disabledBox!.y).toBeLessThan(failuresBox!.y);

        // Callout titles render as paragraphs, so the outline stays header h3 > section h4 > subsection h5.
        await expect(flyout.getByRole('heading', { name: 'Rule is disabled' })).toHaveCount(0);
        await expect(flyout.getByRole('heading', { name: '3 actions failed' })).toHaveCount(0);
      });
    }

    test('flyout-wide callouts stay mounted across tab switches', async ({ pageObjects }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('service');
      await app.openFlyout('service', session);

      // Mark the DOM node; a remount would replace it with an unmarked one.
      const disabled = app.bodyCallout('service', session, 'Disabled');
      await disabled.evaluate((el) => el.setAttribute('data-remount-marker', 'original'));

      await app.tab('service', session, 'Activity').click();
      await expect(app.tab('service', session, 'Activity')).toHaveAttribute(
        'aria-selected',
        'true'
      );

      await expect(disabled).toBeVisible();
      await expect(disabled).toHaveAttribute('data-remount-marker', 'original');
    });

    test('regular sections are exposed as named regions', async ({ pageObjects }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('component');
      const flyout = await app.openFlyout('component', session);

      await expect(flyout.getByRole('region', { name: 'Flyout properties' })).toBeVisible();
      await expect(flyout.getByRole('region', { name: 'Details' })).toBeVisible();
      await expect(flyout.getByRole('region', { name: 'Child flyouts' })).toBeVisible();
    });

    for (const form of FORMS) {
      test(`${form} subsections are headings inside their parent, not regions of their own`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        const flyout = await app.openFlyout(form, session);
        await app.openDetails(form, session);

        await expect(flyout.getByRole('heading', { level: 5, name: 'Host' })).toBeVisible();
        await expect(flyout.getByRole('heading', { level: 5, name: 'Service' })).toBeVisible();

        // Subsections are not defined as separate regions.
        await expect(flyout.getByRole('region', { name: 'Host' })).toHaveCount(0);
      });
    }

    test('accordion sections report their expanded state and own their panel', async ({
      pageObjects,
    }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('service');
      const flyout = await app.openFlyout('service', session);

      const details = flyout.getByRole('button', { name: 'Details' });
      await expect(details).toHaveAttribute('aria-expanded', 'false');
      await expect(details).toHaveAttribute('aria-controls', /.+/);

      await details.press('Enter');
      await expect(details).toHaveAttribute('aria-expanded', 'true');

      // Ensure the panel holding the subsections is visible.
      await expect(flyout.getByRole('heading', { level: 5, name: 'Host' })).toBeVisible();
    });

    for (const form of FORMS) {
      test(`${form} badge overflow is reachable by keyboard and names its contents`, async ({
        page,
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);

        const overflow = app.badgeOverflow(form, session);
        await expect(overflow).toHaveAccessibleName(/Show 2 more badges/);

        await overflow.focus();
        await expect(overflow).toBeFocused();
        await overflow.press('Enter');

        const popover = page.getByRole('dialog', { name: 'Show 2 more badges' });
        await expect(popover).toBeVisible();
        await expect(popover.getByText('Metadata 3 very very very very long label')).toBeVisible();

        const { violations } = await page.checkA11y({
          include: [app.rootSelector(form, session), app.badgeOverflowPanelSelector()],
        });
        expect(violations).toHaveLength(0);
      });
    }

    test('tabs follow the roving tabindex pattern with manual activation', async ({
      page,
      pageObjects,
    }) => {
      const app = pageObjects.flyoutSystem;
      const session = app.session('service');
      const flyout = await app.openFlyout('service', session);

      const overview = flyout.getByRole('tab', { name: 'Overview' });
      const activity = flyout.getByRole('tab', { name: 'Activity' });

      // Only the selected tab is a tab stop; the rest are reached with the arrow keys.
      await expect(overview).toHaveAttribute('tabindex', '0');
      await expect(activity).toHaveAttribute('tabindex', '-1');

      await overview.focus();
      await overview.press('ArrowRight');
      await expect(activity).toBeFocused();

      // Moving focus alone must not change the selection.
      await expect(overview).toHaveAttribute('aria-selected', 'true');
      await expect(activity).toHaveAttribute('aria-selected', 'false');

      await activity.press('Enter');
      await expect(activity).toHaveAttribute('aria-selected', 'true');
      await expect(overview).toHaveAttribute('aria-selected', 'false');

      // Verify the keyboard path selects the active panel.
      await expect(activity).toHaveAttribute('aria-controls', /.+/);
      const panel = flyout.getByRole('tabpanel');
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute('aria-labelledby', /.+/);

      // EUI gives the body overflow container tabIndex={0}. The banner sits inside it, so its
      // callout action comes after the container and before the tab panel.
      await activity.press('Tab');
      await expect(app.scrollContainer('service', session)).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(app.bodyCalloutRetry('service', session)).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(panel).toBeFocused();
    });

    for (const form of FORMS) {
      test(`${form} footer tab order reaches the secondary action before the primary`, async ({
        pageObjects,
      }) => {
        const app = pageObjects.flyoutSystem;
        const session = app.session(form);
        await app.openFlyout(form, session);

        const close = app.footerCloseAction(form, session);
        const save = app.footerSaveAction(form, session);
        await expect(close).toBeVisible();
        await expect(save).toBeVisible();

        await close.focus();
        await close.press('Tab');
        await expect(save).toBeFocused();
      });
    }
  }
);
