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
  SECURITY_DATA_VIEWS,
  PUSH_FLYOUT_VIEWPORT,
} from '../../fixtures/security_experience';

/**
 * Sanity coverage that the Security flyout enhancement is gated on the security solution view: the
 * security root profile only resolves when `solutionNavId === Security`. Under a non-security view the
 * same alert document opens the default Discover doc viewer without the security header.
 *
 * Stateful only — the solution view cannot be switched on serverless (it is fixed by project type).
 */
spaceTest.describe(
  'Security in Discover - Profile gated on security solution view',
  { tag: tags.stateful.all },
  () => {
    // Force a wide viewport so the doc viewer flyout (pushMinBreakpoint="xl") renders in push mode.
    spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupSecurityExperience(scoutSpace, config);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownSecurityExperience(scoutSpace);
    });

    spaceTest(
      'does not enhance the alert flyout under the classic solution view',
      async ({ scoutSpace, browserAuth, pageObjects }) => {
        await scoutSpace.setSolutionView('classic');
        await browserAuth.loginAsPrivilegedUser();

        const { discover, securityDiscoverFlyout } = pageObjects;
        await discover.goto();
        await discover.selectDataView(SECURITY_DATA_VIEWS.ALERTS);
        await discover.waitForDocTableRendered();
        await discover.openAndWaitForDocViewerFlyout({ rowIndex: 0 });

        await expect(securityDiscoverFlyout.docViewer).toBeVisible();
        await expect(securityDiscoverFlyout.alertTitle).toBeHidden();
        await expect(securityDiscoverFlyout.aboutSection).toBeHidden();
      }
    );
  }
);
