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
} from '../../fixtures/security_experience';

/**
 * Custom Discover data-grid cell renderers registered by the Security context-awareness profile
 * (one_discover/cell_renderers/cell_renderers.tsx). The profile only registers them when the data
 * view's index pattern includes `.alerts-security.alerts-` (see `security_root_profile/profile.tsx`),
 * so these tests open a saved search pinned to an alerts-pattern data view with the relevant columns:
 *   - `kibana.alert.rule.name` → RuleNameCellRenderer (clickable link, opens the rule flyout)
 *   - `source.ip` (mapped as `ip`) → IpCellRenderer (clickable link, opens the network flyout)
 *   - `kibana.alert.workflow_status` → Timeline DefaultCellRenderer → RuleStatus badge
 */
spaceTest.describe('Security in Discover - cell renderers', { tag: tags.stateful.all }, () => {
  spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT });

  spaceTest.beforeAll(async ({ scoutSpace, config }) => {
    await setupSecurityExperience(scoutSpace, config);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.securityDiscoverFlyout.openCellRenderersSavedSearch();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await teardownSecurityExperience(scoutSpace);
  });

  spaceTest(
    'rule name column renders a link that opens the rule flyout',
    async ({ pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;

      await expect(securityDiscoverFlyout.ruleNameCellLink).toBeVisible();
      await securityDiscoverFlyout.ruleNameCellLink.click();

      // The link opens the rule flyout. The synthetic alert's rule UUID isn't a real detection rule, so
      // RuleDetails renders its error state — full rule rendering is covered by the security_solution
      // flyout_v2 suite. Asserting the error confirms the click opened the (rule) flyout.
      await expect(securityDiscoverFlyout.ruleFlyoutError).toBeVisible();
    }
  );

  spaceTest('IP column renders a link that opens the network flyout', async ({ pageObjects }) => {
    const { securityDiscoverFlyout } = pageObjects;

    await expect(securityDiscoverFlyout.ipCellLink).toBeVisible();
    await securityDiscoverFlyout.ipCellLink.click();
    await expect(securityDiscoverFlyout.networkFlyoutTitle).toBeVisible();
  });

  spaceTest('workflow status column renders the status badge', async ({ pageObjects }) => {
    const { securityDiscoverFlyout } = pageObjects;

    await expect(securityDiscoverFlyout.statusCell).toBeVisible();
    await expect(securityDiscoverFlyout.statusCell).toContainText('open');
  });
});
