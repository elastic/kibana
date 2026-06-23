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
  TAKE_ACTION_TEST_SUBJECTS as TA,
} from '../../../../fixtures/security_experience';

/**
 * Take action menu for an alert document opened in Discover. Verifies the menu lists the alert
 * actions and that each opens its sub-panel / modal. Full execution (actually closing an alert,
 * creating a case, etc.) is covered by the security_solution flyout_v2 suite, which provisions real
 * rules / alerts; here the synthetic alert index can't back those requests, so we stop at "opens".
 *
 * `investigate-in-timeline` only renders inside the security app, so it is hidden in Discover.
 */
spaceTest.describe(
  'Security in Discover - Alert document take action',
  { tag: tags.stateful.all },
  () => {
    spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupSecurityExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.securityDiscoverFlyout.openAlertFlyoutFromDiscover();
      await pageObjects.securityDiscoverFlyout.waitForAlertHeader();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownSecurityExperience(scoutSpace);
    });

    spaceTest(
      'lists the alert actions and swaps timeline for explore (Discover)',
      async ({ pageObjects }) => {
        const { securityDiscoverFlyout } = pageObjects;
        await securityDiscoverFlyout.openTakeActionMenu();

        // Alert-specific actions are present
        await expect.soft(securityDiscoverFlyout.takeActionItem(TA.STATUS_CLOSE)).toBeVisible();
        await expect.soft(securityDiscoverFlyout.takeActionItem(TA.ALERT_TAGS)).toBeVisible();
        await expect.soft(securityDiscoverFlyout.takeActionItem(TA.ALERT_ASSIGNEES)).toBeVisible();
        await expect.soft(securityDiscoverFlyout.takeActionItem(TA.RUN_WORKFLOW)).toBeVisible();
        await expect.soft(securityDiscoverFlyout.takeActionItem(TA.ADD_TO_NEW_CASE)).toBeVisible();
        await expect
          .soft(securityDiscoverFlyout.takeActionItem(TA.ADD_TO_EXISTING_CASE))
          .toBeVisible();

        // Outside the security app (i.e. in Discover), investigate-in-timeline is replaced by the
        // explore action ("Explore in Alerts" for an alert).
        await expect.soft(securityDiscoverFlyout.takeActionItem(TA.EXPLORE)).toBeVisible();
        await expect(securityDiscoverFlyout.takeActionItem(TA.INVESTIGATE_IN_TIMELINE)).toHaveCount(
          0
        );
      }
    );

    spaceTest(
      'explore action opens the security alerts page in a new tab',
      async ({ page, pageObjects }) => {
        const { securityDiscoverFlyout } = pageObjects;
        await securityDiscoverFlyout.openTakeActionMenu();

        // The explore action opens the relevant security page in a new browser tab (window.open).
        const newTabPromise = page.context().waitForEvent('page');
        await securityDiscoverFlyout.clickTakeActionItem(TA.EXPLORE);
        const newTab = await newTabPromise;
        await expect(newTab).toHaveURL(/app\/security\/alerts/, { timeout: 30_000 });
        await newTab.close();
      }
    );

    spaceTest('apply alert tags opens the tags sub-panel', async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;
      await securityDiscoverFlyout.openTakeActionMenu();
      await securityDiscoverFlyout.clickTakeActionItem(TA.ALERT_TAGS);
      await expect(securityDiscoverFlyout.alertTagsPanel).toBeVisible();
    });

    spaceTest('assign alert opens the assignees sub-panel', async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;
      await securityDiscoverFlyout.openTakeActionMenu();
      await securityDiscoverFlyout.clickTakeActionItem(TA.ALERT_ASSIGNEES);
      await expect(securityDiscoverFlyout.alertAssigneesPanel).toBeVisible();
    });

    // Note: actually opening the closing-reason sub-panel / changing status needs a real alert in a
    // `.alerts-*` index (the close request 400s for a synthetic doc), so it is covered by the
    // security_solution flyout_v2 suite. Here the composition test above asserts the item is present.

    spaceTest('add to new case opens the case creation dialog', async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;
      await securityDiscoverFlyout.openTakeActionMenu();
      await securityDiscoverFlyout.clickTakeActionItem(TA.ADD_TO_NEW_CASE);
      await expect(securityDiscoverFlyout.createCaseDialogTitle).toBeVisible();
    });

    spaceTest('add to existing case opens the case selector modal', async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;
      await securityDiscoverFlyout.openTakeActionMenu();
      await securityDiscoverFlyout.clickTakeActionItem(TA.ADD_TO_EXISTING_CASE);
      await expect(securityDiscoverFlyout.allCasesModal).toBeVisible();
    });
  }
);
