/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutTestConfig } from '@kbn/scout';
import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DASHBOARD_DEFAULT_INDEX_TITLE, DASHBOARD_SAVED_SEARCH_ARCHIVE } from '../constants';

const getExpected = (config: ScoutTestConfig) => {
  if (config.projectType === 'es' || config.projectType === 'security') {
    return {
      groups: [
        'visualizationsGroup',
        'controlsGroup',
        'annotation-and-navigationGroup',
        'mlGroup',
        'logs-aiopsGroup',
        'legacyGroup',
      ],
      count: 20,
    };
  }

  return {
    groups: [
      'visualizationsGroup',
      'controlsGroup',
      'annotation-and-navigationGroup',
      'mlGroup',
      'logs-aiopsGroup',
      'observabilityGroup',
      'legacyGroup',
    ],
    count: 27,
  };
};

/**
 * Dashboard's add panel menu is populated
 * by ui_actions trigger ADD_PANEL_TRIGGER.
 * This test exists to ensures additions to menu
 * notify our team and can be reviewed by design.
 */
spaceTest.describe(
  'Dashboard add panel flyout',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
    ],
  },
  () => {
    let expectedCount: number;
    let expectedGroups: string[];

    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      const expected = getExpected(config);
      expectedCount = expected.count;
      expectedGroups = expected.groups;
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

    spaceTest('renders add panel flyout', async ({ pageObjects }) => {
      await spaceTest.step('open new dashboard and add panel flyout', async () => {
        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.openAddPanelFlyout();
      });

      await spaceTest.step('verify panel groups', async () => {
        const groups = await pageObjects.dashboard.getAddPanelFlyoutGroups();
        expect(groups).toStrictEqual(expectedGroups);
      });

      await spaceTest.step('verify total panel count', async () => {
        expect(await pageObjects.dashboard.getAddPanelFlyoutPanelTypesCount()).toBe(expectedCount);
      });
    });
  }
);
