/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags, type ScoutTestConfig } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DASHBOARD_DEFAULT_INDEX_TITLE, DASHBOARD_SAVED_SEARCH_ARCHIVE } from '../constants';

// includes "observabilityGroup" panel group
const DEFAULT_DASHBOARD_PANEL_GROUP_ORDER = [
  'visualizationsGroup',
  'controlsGroup',
  'annotation-and-navigationGroup',
  'mlGroup',
  'observabilityGroup',
  'legacyGroup',
];

const LOGS_ESSENTIALS_DASHBOARD_PANEL_GROUP_ORDER = [
  'visualizationsGroup',
  'controlsGroup',
  'annotation-and-navigationGroup',
  'legacyGroup',
];

const getExpectedPanelGroupOrder = (config: ScoutTestConfig) => {
  if (config.serverless && config.productTier === 'logs_essentials') {
    return LOGS_ESSENTIALS_DASHBOARD_PANEL_GROUP_ORDER;
  }
  return DEFAULT_DASHBOARD_PANEL_GROUP_ORDER;
};

const getExpectedPanelTypeCount = (config: ScoutTestConfig) => {
  return config.serverless && config.productTier === 'logs_essentials' ? 14 : 27;
};

// Failing: See https://github.com/elastic/kibana/issues/259576
spaceTest.describe.skip(
  'Dashboard panel listing (includes observability group)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.all] },
  () => {
    let expectedPanelGroupOrder: string[];

    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      expectedPanelGroupOrder = getExpectedPanelGroupOrder(config);
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(DASHBOARD_SAVED_SEARCH_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(DASHBOARD_DEFAULT_INDEX_TITLE);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('renders panel groups and panel count', async ({ pageObjects, config }) => {
      await spaceTest.step('open new dashboard and add panel flyout', async () => {
        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.openAddPanelFlyout();
      });

      await spaceTest.step('verify panel groups order', async () => {
        const panelGroupOrder = await pageObjects.dashboard.getPanelGroupOrder();
        expect(panelGroupOrder).toHaveLength(expectedPanelGroupOrder.length);
        expect(panelGroupOrder).toStrictEqual(expectedPanelGroupOrder);
      });

      await spaceTest.step('verify total panel count', async () => {
        expect(await pageObjects.dashboard.getPanelTypeCount()).toBe(
          getExpectedPanelTypeCount(config)
        );
      });
    });
  }
);
