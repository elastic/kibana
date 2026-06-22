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
} from '../../../../fixtures/security_experience';

/**
 * IOC (threat intelligence indicator) flyout rendered inside Discover. The Security profile injects
 * the IOC overview tab / header / footer for documents where `event.type` includes `indicator`.
 */
spaceTest.describe(
  'Security in Discover - IOC flyout',
  { tag: [...tags.stateful.all, ...tags.serverless.security.complete] },
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

    spaceTest('IOC flyout opens with the indicator overview', async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;
      await securityDiscoverFlyout.openIocFlyoutFromDiscover();

      await securityDiscoverFlyout.waitForIocOverview();
      await expect.soft(securityDiscoverFlyout.iocOverviewHighLevelBlocks).toBeVisible();
    });

    spaceTest(
      'doc viewer tabs: IOC Overview is the default tab and Table / JSON tabs switch',
      async ({ pageObjects }) => {
        const { securityDiscoverFlyout } = pageObjects;
        await securityDiscoverFlyout.openIocFlyoutFromDiscover();
        await securityDiscoverFlyout.waitForIocOverview();

        // The security IOC Overview tab is injected at order 0, so it is selected by default.
        await expect(securityDiscoverFlyout.iocOverviewTab).toHaveAttribute(
          'aria-selected',
          'true'
        );

        // Discover's default Table and JSON tabs are present alongside it and switch correctly.
        await securityDiscoverFlyout.selectTab(securityDiscoverFlyout.tableTab);
        await expect(securityDiscoverFlyout.tableTabContent).toBeVisible();

        await securityDiscoverFlyout.selectTab(securityDiscoverFlyout.iocOverviewTab);
        await expect(securityDiscoverFlyout.iocOverviewTitle).toBeVisible();
      }
    );
  }
);
