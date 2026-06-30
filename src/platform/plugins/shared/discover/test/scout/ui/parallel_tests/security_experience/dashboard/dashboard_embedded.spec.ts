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
} from '../../../fixtures/security_experience';

/**
 * Discover embedded in a Dashboard. A saved-search panel uses the same unified data table and
 * expand-row → doc viewer flyout path, so the Security profile enhances the flyout there too. Light
 * smoke: confirm the security flyout opens with header / overview / footer from a dashboard panel.
 */
spaceTest.describe(
  'Security in Discover - Dashboard embedded flyout',
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
      'alert flyout opens from a Discover panel embedded in a dashboard',
      async ({ pageObjects }) => {
        const { securityDiscoverFlyout } = pageObjects;
        await securityDiscoverFlyout.openAlertFlyoutFromDashboard();

        await securityDiscoverFlyout.waitForDocumentHeader();
        await expect.soft(securityDiscoverFlyout.aboutSection).toBeVisible();
        await expect.soft(securityDiscoverFlyout.takeActionButton).toBeVisible();
      }
    );
  }
);
