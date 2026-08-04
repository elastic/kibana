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
 * Discover replaces the Security app's "Investigate in Timeline" action with an "Explore in Alerts"
 * action. Menu composition and action sub-panels are covered by flyout_v2 unit and Scout tests.
 */
spaceTest.describe(
  'Security in Discover - Alert document take action',
  { tag: tags.stateful.all },
  () => {
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

    spaceTest(
      'explore action opens the security alerts page in a new tab',
      async ({ page, pageObjects }) => {
        const { securityDiscoverFlyout } = pageObjects;
        await securityDiscoverFlyout.openTakeActionMenu();

        // The explore action opens the relevant security page in a new browser tab (window.open).
        const newTabPromise = page.context().waitForEvent('page');
        await securityDiscoverFlyout.clickTakeActionItem(TA.EXPLORE);
        const newTab = await newTabPromise;
        await expect(newTab).toHaveURL(/app\/security\/alerts/);
        await newTab.close();
      }
    );
  }
);
