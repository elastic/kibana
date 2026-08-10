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
 * injects the alert Overview tab and wires Discover's filter and column actions into it. Security
 * flyout component rendering and local cell-action behaviour are covered by the security_solution
 * flyout_v2 suite and unit tests.
 */
spaceTest.describe(
  'Security in Discover - Alert document flyout',
  { tag: tags.stateful.all },
  () => {
    // Force a wide viewport so the doc viewer flyout (pushMinBreakpoint="xl") renders in push mode.
    spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupSecurityExperience(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.securityDiscoverFlyout.openAlertFlyoutFromDiscover();
      await pageObjects.securityDiscoverFlyout.waitForDocumentHeader();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownSecurityExperience(scoutSpace);
    });

    spaceTest('adds a filter from a highlighted field', async ({ pageObjects }) => {
      const { securityDiscoverFlyout, filterBar } = pageObjects;
      const field = 'host.name';
      const value = SECURITY_TEST_DATA.HOST_NAME;

      await securityDiscoverFlyout.hoverHighlightedFieldValue(field);
      await expect(securityDiscoverFlyout.cellActionFilterIn).toBeVisible();
      await securityDiscoverFlyout.cellActionFilterIn.press('Enter');
      expect(await filterBar.hasFilter({ field, value, enabled: true, negated: false })).toBe(true);
    });

    // Kept as its own test (not chained with the filter actions above): adding/removing filters
    // re-searches Discover and re-renders the push flyout, which destabilises the cell-actions
    // popover. From a fresh flyout the grid is stable, so the toggle-column action is reliable.
    spaceTest(
      'add as column cell action adds the field to the Discover table',
      async ({ pageObjects }) => {
        const { securityDiscoverFlyout, discover, docViewer } = pageObjects;
        const field = 'host.name';

        await securityDiscoverFlyout.hoverHighlightedFieldValue(field);
        // Wait for the popover button to settle (enabled) before clicking, so Playwright's
        // actionability check has a stable target instead of bypassing it with `force`.
        await expect(securityDiscoverFlyout.cellActionToggleColumn).toBeEnabled();
        await securityDiscoverFlyout.cellActionToggleColumn.click();

        // The column is added to the grid behind the flyout; close it and assert the header.
        await docViewer.close();
        expect(await discover.getDocHeader()).toContain(field);
      }
    );

    spaceTest(
      'doc viewer tabs: security Overview is the default tab and Table / JSON tabs switch',
      async ({ pageObjects }) => {
        const { securityDiscoverFlyout } = pageObjects;

        await expect(securityDiscoverFlyout.overviewTab).toHaveAttribute('aria-selected', 'true');
        await expect(securityDiscoverFlyout.alertTitle).toBeVisible();

        await expect(securityDiscoverFlyout.tableTab).toBeVisible();
        await expect(securityDiscoverFlyout.jsonTab).toBeVisible();

        await securityDiscoverFlyout.selectTab(securityDiscoverFlyout.tableTab);
        await expect(securityDiscoverFlyout.tableTab).toHaveAttribute('aria-selected', 'true');
        await expect(securityDiscoverFlyout.tableTabContent).toBeVisible();
        await expect(securityDiscoverFlyout.overviewTab).toHaveAttribute('aria-selected', 'false');

        await securityDiscoverFlyout.selectTab(securityDiscoverFlyout.jsonTab);
        await expect(securityDiscoverFlyout.jsonTab).toHaveAttribute('aria-selected', 'true');

        await securityDiscoverFlyout.selectTab(securityDiscoverFlyout.overviewTab);
        await expect(securityDiscoverFlyout.overviewTab).toHaveAttribute('aria-selected', 'true');
        await expect(securityDiscoverFlyout.alertTitle).toBeVisible();
      }
    );
  }
);
