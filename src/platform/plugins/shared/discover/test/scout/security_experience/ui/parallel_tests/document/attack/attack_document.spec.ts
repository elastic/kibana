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
} from '../../../fixtures';

/**
 * Attack Discovery documents were added to the Security context-awareness profile after this suite
 * was introduced. This test covers only the Discover integration boundary: routing a matching
 * document to the attack Overview tab while retaining the Unified Doc Viewer tabs.
 */
spaceTest.describe(
  'Security in Discover - Attack Discovery document flyout',
  { tag: tags.stateful.all },
  () => {
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
      'routes an attack document to its Overview tab alongside the Discover tabs',
      async ({ pageObjects }) => {
        const { securityDiscoverFlyout } = pageObjects;
        await securityDiscoverFlyout.openAttackFlyoutFromDiscover();

        await expect(securityDiscoverFlyout.attackHeaderTitle).toBeVisible();
        await expect(securityDiscoverFlyout.attackOverviewTab).toHaveAttribute(
          'aria-selected',
          'true'
        );
        await expect(securityDiscoverFlyout.attackOverview).toBeVisible();

        await securityDiscoverFlyout.selectTab(securityDiscoverFlyout.tableTab);
        await expect(securityDiscoverFlyout.tableTab).toHaveAttribute('aria-selected', 'true');
        await expect(securityDiscoverFlyout.tableTabContent).toBeVisible();
        await expect(securityDiscoverFlyout.jsonTab).toBeVisible();
      }
    );
  }
);
