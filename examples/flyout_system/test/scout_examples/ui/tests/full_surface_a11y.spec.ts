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

test.describe('Flyout System - full surface accessibility', { tag: tags.stateful.classic }, () => {
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

    // Wait for header blocks to render before testing.
    await expect(app.infoBlocks('component', session)).toBeVisible();
    await expect(app.badgeOverflow('component', session)).toBeVisible();

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

  test('regular sections are exposed as named regions', async ({ pageObjects }) => {
    const app = pageObjects.flyoutSystem;
    const session = app.session('component');
    const flyout = await app.openFlyout('component', session);

    await expect(flyout.getByRole('region', { name: 'Flyout properties' })).toBeVisible();
    await expect(flyout.getByRole('region', { name: 'Details' })).toBeVisible();
    await expect(flyout.getByRole('region', { name: 'Child flyouts' })).toBeVisible();
  });

  test('subsections are headings inside their section, not regions of their own', async ({
    pageObjects,
  }) => {
    const app = pageObjects.flyoutSystem;
    const session = app.session('component');
    const flyout = await app.openFlyout('component', session);

    const details = flyout.getByRole('region', { name: 'Details' });
    await expect(details.getByRole('heading', { level: 5, name: 'Host' })).toBeVisible();
    await expect(details.getByRole('heading', { level: 5, name: 'Service' })).toBeVisible();

    // Subsections are not defined as separate regions.
    await expect(flyout.getByRole('region', { name: 'Host' })).toHaveCount(0);
  });

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

  test('badge overflow is reachable by keyboard and names its contents', async ({
    page,
    pageObjects,
  }) => {
    const app = pageObjects.flyoutSystem;
    const session = app.session('component');
    await app.openFlyout('component', session);

    const overflow = app.badgeOverflow('component', session);
    await expect(overflow).toHaveAccessibleName(/Show 2 more badges/);

    await overflow.focus();
    await expect(overflow).toBeFocused();
    await overflow.press('Enter');

    const popover = page.getByRole('dialog', { name: 'Show 2 more badges' });
    await expect(popover).toBeVisible();
    await expect(popover.getByText('Metadata 3 very very very very long label')).toBeVisible();

    // Popover renders in an EuiPortal, outside the flyout root.
    const { violations } = await page.checkA11y({
      include: [app.rootSelector('component', session), '[data-euiportal="true"]'],
    });
    expect(violations).toHaveLength(0);
  });

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

    // EUI gives the body overflow container tabIndex={0}, which appears before the tab panel.
    await activity.press('Tab');
    await expect(app.scrollContainer('service', session)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(panel).toBeFocused();
  });

  test('footer tab order reaches the secondary action before the primary', async ({
    pageObjects,
  }) => {
    const app = pageObjects.flyoutSystem;
    const session = app.session('component');
    await app.openFlyout('component', session);

    const close = app.footerCloseAction('component', session);
    const save = app.footerSaveAction('component', session);
    await expect(close).toBeVisible();
    await expect(save).toBeVisible();

    await close.focus();
    await close.press('Tab');
    await expect(save).toBeFocused();
  });
});
