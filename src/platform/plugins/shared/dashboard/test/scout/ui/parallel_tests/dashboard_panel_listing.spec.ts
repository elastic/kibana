/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, expect, tags } from '@kbn/scout';

const DASHBOARD_FIXTURES_PATH =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana';

spaceTest.describe('Dashboard panel listing', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(DASHBOARD_FIXTURES_PATH);
    await scoutSpace.uiSettings.set({
      defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.goto();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'renders panel groups in predefined order with expected panel count',
    async ({ page, pageObjects }) => {
      await spaceTest.step('open new dashboard and add panel flyout', async () => {
        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.openAddPanelFlyout();
      });

      await spaceTest.step('verify panel groups are in correct order', async () => {
        const panelSelectionList = page.testSubj.locator('dashboardPanelSelectionList');

        // Get all panel group elements
        const panelGroups = await panelSelectionList
          .locator('[data-test-subj*="dashboardEditorMenu-"]')
          .all();

        // Build array of [order, groupTitle] pairs
        const panelGroupData = await Promise.all(
          panelGroups.map(async (panelGroup) => {
            const order = await panelGroup.getAttribute('data-group-sort-order');
            const testSubj = await panelGroup.getAttribute('data-test-subj');
            const match = testSubj?.match(/dashboardEditorMenu-(.*)/);
            return { order, groupTitle: match?.[1] };
          })
        );

        // Filter valid entries and build map
        const panelGroupByOrder = new Map<string, string>();
        panelGroupData
          .filter((item): item is { order: string; groupTitle: string } =>
            Boolean(item.order && item.groupTitle)
          )
          .forEach((item) => panelGroupByOrder.set(item.order, item.groupTitle));

        expect(panelGroupByOrder.size).toBe(6);

        // Verify groups are in the expected order
        expect([...panelGroupByOrder.values()]).toStrictEqual([
          'visualizationsGroup',
          'controlsGroup',
          'annotation-and-navigationGroup',
          'mlGroup',
          'observabilityGroup',
          'legacyGroup',
        ]);
      });

      await spaceTest.step('verify total panel count', async () => {
        const panelSelectionList = page.testSubj.locator('dashboardPanelSelectionList');

        // Count all panel type list items
        const panelTypes = panelSelectionList.locator('li');

        // Any changes to the number of panels needs to be audited by @elastic/kibana-presentation
        await expect(panelTypes).toHaveCount(24);
      });
    }
  );
});
