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
 * Event document flyout rendered inside Discover. The Security context-awareness profile enhances
 * Discover's doc viewer for a raw event document (`event.kind` present and not `signal`), reusing the
 * same overview tab as alerts.
 */
spaceTest.describe(
  'Security in Discover - Event document flyout',
  { tag: [...tags.stateful.all, ...tags.serverless.security.complete] },
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

    spaceTest('opens with security header and overview sections', async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;
      await securityDiscoverFlyout.openEventFlyoutFromDiscover();

      await securityDiscoverFlyout.waitForAlertHeader();
      // A title icon renders (EuiIcon does not expose the specific glyph as a stable DOM attribute,
      // so we assert presence rather than the exact `analyzeEvent` icon).
      await expect.soft(securityDiscoverFlyout.titleIcon).toBeVisible();
      await expect.soft(securityDiscoverFlyout.aboutSection).toBeVisible();
      await expect.soft(securityDiscoverFlyout.investigationSection).toBeVisible();
    });
  }
);
