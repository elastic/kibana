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
import {
  spaceTest,
  setupSecurityExperience,
  teardownSecurityExperience,
  PUSH_FLYOUT_VIEWPORT,
  SECURITY_TEST_DATA,
} from '../../../../fixtures/security_experience';

/**
 * Alert document flyout rendered inside Discover. Confirms the Security context-awareness profile
 * enhances Discover's doc viewer with the security header, overview-tab sections and footer for an
 * alert document (`event.kind: signal`). Domain behaviour (status changes, assignees, tool content)
 * is deliberately left to the security_solution flyout_v2 suite / unit tests to limit flakiness.
 */
spaceTest.describe(
  'Security in Discover - Alert document flyout',
  { tag: tags.stateful.all },
  () => {
    // Force a wide viewport so the doc viewer flyout (pushMinBreakpoint="xl") renders in push mode.
    spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupSecurityExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownSecurityExperience(scoutSpace);
    });

    spaceTest(
      'opens with security header, overview sections, and footer',
      async ({ pageObjects }) => {
        const { securityDiscoverFlyout } = pageObjects;
        await securityDiscoverFlyout.openAlertFlyoutFromDiscover();

        await securityDiscoverFlyout.waitForAlertHeader();

        // Header — a title icon renders (EuiIcon does not expose the specific glyph as a stable
        // DOM attribute, so we assert presence rather than the exact `warning` icon).
        await expect.soft(securityDiscoverFlyout.titleIcon).toBeVisible();
        await expect.soft(securityDiscoverFlyout.severity).toBeVisible();
        await expect.soft(securityDiscoverFlyout.statusBadge).toBeVisible();
        await expect.soft(securityDiscoverFlyout.riskScore).toBeVisible();

        // Overview tab body sections
        await expect.soft(securityDiscoverFlyout.aboutSection).toBeVisible();
        await expect.soft(securityDiscoverFlyout.ruleSummaryButton).toBeVisible();
        await expect.soft(securityDiscoverFlyout.investigationSection).toBeVisible();
        await expect.soft(securityDiscoverFlyout.visualizationsSection).toBeVisible();
        await expect.soft(securityDiscoverFlyout.insightsSection).toBeVisible();
        await expect.soft(securityDiscoverFlyout.responseSection).toBeVisible();

        // Footer
        await expect.soft(securityDiscoverFlyout.takeActionButton).toBeVisible();
      }
    );

    spaceTest(
      'highlighted field hover actions: shows all buttons and each works',
      async ({ page, pageObjects }) => {
        const { securityDiscoverFlyout, filterBar } = pageObjects;
        const field = 'host.name';
        const value = SECURITY_TEST_DATA.HOST_NAME;

        // Needed so the copy-to-clipboard action can be verified via navigator.clipboard.
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

        await securityDiscoverFlyout.openAlertFlyoutFromDiscover();
        await securityDiscoverFlyout.waitForAlertHeader();

        await spaceTest.step('hover reveals all relevant cell-action buttons', async () => {
          await securityDiscoverFlyout.hoverHighlightedFieldValue(field);
          await expect(securityDiscoverFlyout.cellActionFilterIn).toBeVisible();
          await expect(securityDiscoverFlyout.cellActionFilterOut).toBeVisible();
          await expect(securityDiscoverFlyout.cellActionFilterExists).toBeVisible();
          await expect(securityDiscoverFlyout.cellActionToggleColumn).toBeVisible();
          await expect(securityDiscoverFlyout.cellActionCopy).toBeVisible();
        });

        await spaceTest.step('filter for adds an enabled, non-negated filter', async () => {
          await securityDiscoverFlyout.cellActionFilterIn.click();
          expect(await filterBar.hasFilter({ field, value, enabled: true, negated: false })).toBe(
            true
          );
          await filterBar.removeFilter(field);
        });

        await spaceTest.step('filter exists adds a filter for the field', async () => {
          await securityDiscoverFlyout.hoverHighlightedFieldValue(field);
          await securityDiscoverFlyout.cellActionFilterExists.click();
          expect(await filterBar.getFilterCount()).toBeGreaterThan(0);
          await filterBar.removeFilter(field);
        });

        await spaceTest.step('copy to clipboard copies the field value', async () => {
          await securityDiscoverFlyout.hoverHighlightedFieldValue(field);
          await securityDiscoverFlyout.cellActionCopy.click();
          const clipboard = await page.evaluate(() => navigator.clipboard.readText());
          expect(clipboard).toContain(value);
        });

        await spaceTest.step('filter out adds a negated filter', async () => {
          await securityDiscoverFlyout.openAlertFlyoutFromDiscover();
          await securityDiscoverFlyout.waitForAlertHeader();
          await securityDiscoverFlyout.hoverHighlightedFieldValue(field);
          await securityDiscoverFlyout.cellActionFilterOut.click();
          expect(await filterBar.hasFilter({ field, value, negated: true })).toBe(true);
        });
      }
    );

    spaceTest(
      'doc viewer tabs: security Overview is the default tab and Table / JSON tabs switch',
      async ({ pageObjects }) => {
        const { securityDiscoverFlyout } = pageObjects;
        await securityDiscoverFlyout.openAlertFlyoutFromDiscover();
        await securityDiscoverFlyout.waitForAlertHeader();

        await expect(securityDiscoverFlyout.overviewTab).toHaveAttribute('aria-selected', 'true');
        await expect(securityDiscoverFlyout.aboutSection).toBeVisible();

        await expect(securityDiscoverFlyout.tableTab).toBeVisible();
        await expect(securityDiscoverFlyout.jsonTab).toBeVisible();

        await securityDiscoverFlyout.selectTab(securityDiscoverFlyout.tableTab);
        await expect(securityDiscoverFlyout.tableTabContent).toBeVisible();
        await expect(securityDiscoverFlyout.overviewTab).toHaveAttribute('aria-selected', 'false');

        await securityDiscoverFlyout.selectTab(securityDiscoverFlyout.jsonTab);

        await securityDiscoverFlyout.selectTab(securityDiscoverFlyout.overviewTab);
        await expect(securityDiscoverFlyout.aboutSection).toBeVisible();
      }
    );
  }
);
