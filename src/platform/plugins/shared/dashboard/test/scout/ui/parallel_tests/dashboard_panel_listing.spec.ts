/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DASHBOARD_DEFAULT_INDEX_TITLE, DASHBOARD_SAVED_SEARCH_ARCHIVE } from '../constants';

// may include "observabilityGroup" panel group (and other panel groups)
const DASHBOARD_PANEL_GROUP_ORDER = [
  'visualizationsGroup',
  'controlsGroup',
  'annotation-and-navigationGroup',
  'mlGroup',
  'legacyGroup',
];

const DASHBOARD_PANEL_TYPE_COUNT = 18;

spaceTest.describe(
  'Dashboard panel listing',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(DASHBOARD_SAVED_SEARCH_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(DASHBOARD_DEFAULT_INDEX_TITLE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.dashboard.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('renders panel groups and panel count', async ({ pageObjects }) => {
      await spaceTest.step('open new dashboard and add panel flyout', async () => {
        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.openAddPanelFlyout();
      });

      await spaceTest.step('verify panel groups order', async () => {
        const panelGroupOrder = await pageObjects.dashboard.getPanelGroupOrder();
        expect(panelGroupOrder.length).toBeGreaterThanOrEqual(DASHBOARD_PANEL_GROUP_ORDER.length);
        expect(panelGroupOrder).toStrictEqual(expect.arrayContaining(DASHBOARD_PANEL_GROUP_ORDER));
      });

      await spaceTest.step('verify total panel count', async () => {
        expect(await pageObjects.dashboard.getPanelTypeCount()).toBeGreaterThanOrEqual(
          DASHBOARD_PANEL_TYPE_COUNT
        );
      });
    });
  }
);
