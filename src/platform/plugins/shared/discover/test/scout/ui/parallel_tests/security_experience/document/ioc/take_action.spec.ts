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
 * Take action menu for an IOC (indicator) document opened in Discover. The IOC flyout has its own
 * footer menu (separate from the alert/event one). Its composition in Discover (see
 * ioc/main/components/take_action.tsx):
 *  - `investigate-in-timeline` is gated on `isSecurityApp`, so it is HIDDEN in Discover.
 *  - `add-to-existing-case` / `add-to-new-case` are always available.
 *  - `add-to-blocklist` is always rendered but DISABLED unless the indicator type is blocklistable
 *    (`canAddToBlockList`); the synthetic `domain-name` indicator is not, so it stays disabled.
 * Full execution is covered by the security_solution suite; here we verify composition + that the
 * "add to existing case" entry point opens its modal.
 */
spaceTest.describe(
  'Security in Discover - IOC document take action',
  { tag: [...tags.stateful.all, ...tags.serverless.security.complete] },
  () => {
    spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupSecurityExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.securityDiscoverFlyout.openIocFlyoutFromDiscover();
      await pageObjects.securityDiscoverFlyout.waitForIocOverview();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownSecurityExperience(scoutSpace);
    });

    spaceTest('lists case actions, disables blocklist, hides timeline', async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;
      await securityDiscoverFlyout.openIocTakeActionMenu();

      // Case actions are available
      await expect
        .soft(securityDiscoverFlyout.takeActionItem(TA.IOC_ADD_TO_EXISTING_CASE))
        .toBeVisible();
      await expect
        .soft(securityDiscoverFlyout.takeActionItem(TA.IOC_ADD_TO_NEW_CASE))
        .toBeVisible();

      // Add to blocklist is present but disabled (a domain-name indicator is not blocklistable)
      await expect
        .soft(securityDiscoverFlyout.takeActionItem(TA.IOC_ADD_TO_BLOCK_LIST))
        .toBeDisabled();

      // Investigate in Timeline is hidden outside the security app (i.e. in Discover)
      await expect(
        securityDiscoverFlyout.takeActionItem(TA.IOC_INVESTIGATE_IN_TIMELINE)
      ).toHaveCount(0);
    });

    spaceTest('add to existing case opens the case selector modal', async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;
      await securityDiscoverFlyout.openIocTakeActionMenu();
      await securityDiscoverFlyout.clickTakeActionItem(TA.IOC_ADD_TO_EXISTING_CASE);
      await expect(securityDiscoverFlyout.allCasesModal).toBeVisible();
    });
  }
);
