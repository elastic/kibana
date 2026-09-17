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
 * Event document flyout rendered inside Discover. The Security context-awareness profile enhances
 * Discover's doc viewer for a raw event document (`event.kind` present and not `signal`), reusing the
 * same overview tab as alerts.
 */
spaceTest.describe(
  'Security in Discover - Event document flyout',
  { tag: tags.stateful.all },
  () => {
    spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupSecurityExperience(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownSecurityExperience(scoutSpace);
    });

    spaceTest('routes an event document to the security Overview tab', async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;
      await securityDiscoverFlyout.openEventFlyoutFromDiscover();

      await securityDiscoverFlyout.waitForDocumentHeader();
      await expect(securityDiscoverFlyout.overviewTab).toHaveAttribute('aria-selected', 'true');
    });
  }
);
