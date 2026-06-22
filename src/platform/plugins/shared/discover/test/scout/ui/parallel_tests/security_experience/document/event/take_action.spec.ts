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
 * Take action menu for an event document (`event.kind` ≠ signal) opened in Discover. Events expose a
 * reduced menu: add-to-case, document workflow and add-note. The alert-only actions (status change,
 * alert tags, alert assignees, host isolation, run-alert-workflow) must be hidden, and
 * `investigate-in-timeline` is hidden in Discover (security-app only).
 */
spaceTest.describe(
  'Security in Discover - Event document take action',
  { tag: [...tags.stateful.all, ...tags.serverless.security.complete] },
  () => {
    spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupSecurityExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.securityDiscoverFlyout.openEventFlyoutFromDiscover();
      await pageObjects.securityDiscoverFlyout.waitForAlertHeader();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownSecurityExperience(scoutSpace);
    });

    spaceTest('lists event actions and hides alert-only actions', async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;
      await securityDiscoverFlyout.openTakeActionMenu();

      // Available for events
      await expect.soft(securityDiscoverFlyout.takeActionItem(TA.ADD_TO_NEW_CASE)).toBeVisible();
      await expect
        .soft(securityDiscoverFlyout.takeActionItem(TA.ADD_TO_EXISTING_CASE))
        .toBeVisible();
      await expect.soft(securityDiscoverFlyout.takeActionItem(TA.ADD_NOTE)).toBeVisible();

      // Alert-only actions must NOT be present for an event
      await expect.soft(securityDiscoverFlyout.takeActionItem(TA.STATUS_CLOSE)).toHaveCount(0);
      await expect.soft(securityDiscoverFlyout.takeActionItem(TA.ALERT_TAGS)).toHaveCount(0);
      await expect.soft(securityDiscoverFlyout.takeActionItem(TA.ALERT_ASSIGNEES)).toHaveCount(0);
      await expect
        .soft(securityDiscoverFlyout.takeActionItem(TA.INVESTIGATE_IN_TIMELINE))
        .toHaveCount(0);
    });

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
