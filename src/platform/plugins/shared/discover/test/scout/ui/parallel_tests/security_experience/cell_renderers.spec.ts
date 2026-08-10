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
  SECURITY_CELL_RENDERER_SAVED_SEARCH,
  SECURITY_TEST_DATA,
} from '../../fixtures/security_experience';

/**
 * Custom Discover data-grid cell renderers registered by the Security context-awareness profile
 * (one_discover/cell_renderers/cell_renderers.tsx). The profile only registers them when the data
 * view's index pattern includes `.alerts-security.alerts-` (see `security_root_profile/profile.tsx`),
 * so these tests open a saved search pinned to an alerts-pattern data view with the relevant columns:
 *   - `kibana.alert.rule.name` → RuleNameCellRenderer (clickable link, opens the rule flyout)
 *   - `source.ip` (mapped as `ip`) → IpCellRenderer (clickable link, opens the network flyout)
 *   - `host.name` → HostCellRenderer (clickable link, opens the host flyout)
 *   - `user.name` → UserCellRenderer (clickable link, opens the user flyout)
 */
spaceTest.describe('Security in Discover - cell renderers', { tag: tags.stateful.all }, () => {
  spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT });
  let savedSearchId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const importedSavedObjects = await setupSecurityExperience(scoutSpace);
    const savedSearch = importedSavedObjects.find(
      ({ title }) => title === SECURITY_CELL_RENDERER_SAVED_SEARCH
    );
    if (!savedSearch) {
      throw new Error(`Saved search "${SECURITY_CELL_RENDERER_SAVED_SEARCH}" was not imported`);
    }
    savedSearchId = savedSearch.id;
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.securityDiscoverFlyout.openCellRenderersSavedSearch(savedSearchId);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await teardownSecurityExperience(scoutSpace);
  });

  spaceTest(
    'rule name column renders a link that requests the rule details',
    async ({ page, pageObjects }) => {
      const { securityDiscoverFlyout } = pageObjects;

      await expect(securityDiscoverFlyout.ruleNameCellLink).toBeVisible();
      const ruleRequest = page.waitForRequest(
        (request) =>
          request.url().includes('/api/detection_engine/rules') &&
          request.url().includes(SECURITY_TEST_DATA.RULE_UUID)
      );
      await securityDiscoverFlyout.openRuleFlyoutFromCell();

      // The synthetic UUID has no backing detection rule. Assert the Discover renderer handed it to
      // the rule-flyout boundary without depending on the flyout's internal not-found presentation.
      expect((await ruleRequest).method()).toBe('GET');
    }
  );

  spaceTest('IP column renders a link that opens the network flyout', async ({ pageObjects }) => {
    const { securityDiscoverFlyout } = pageObjects;

    await expect(securityDiscoverFlyout.ipCellLink).toBeVisible();
    await securityDiscoverFlyout.openNetworkFlyoutFromCell();
    await expect(securityDiscoverFlyout.networkFlyoutTitle).toBeVisible();
  });

  spaceTest('host column renders a link that opens the host flyout', async ({ pageObjects }) => {
    const { securityDiscoverFlyout } = pageObjects;

    await expect(securityDiscoverFlyout.hostCellLink).toBeVisible();
    await securityDiscoverFlyout.openHostFlyoutFromCell();
    await expect(securityDiscoverFlyout.hostFlyoutHeader).toBeVisible();
  });

  spaceTest('user column renders a link that opens the user flyout', async ({ pageObjects }) => {
    const { securityDiscoverFlyout } = pageObjects;

    await expect(securityDiscoverFlyout.userCellLink).toBeVisible();
    await securityDiscoverFlyout.openUserFlyoutFromCell();
    await expect(securityDiscoverFlyout.userFlyoutHeader).toBeVisible();
  });
});
