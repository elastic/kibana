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

const SERVERLESS_GROUPS = [
  'visualizationsGroup',
  'controlsGroup',
  'annotation-and-navigationGroup',
  'logs-aiopsGroup',
  'mlGroup',
  'legacyGroup',
];

/**
 * Serverless search and security both set `xpack.ml.ad.enabled: true`, so the three
 * anomaly detection actions are compatible and both project types expect the same count.
 */
const getExpected = (config: ScoutTestConfig) => {
  if (config.projectType === 'es' || config.projectType === 'security') {
    return {
      groups: SERVERLESS_GROUPS,
      count: 21,
    };
  }

  return {
    groups: [...SERVERLESS_GROUPS, 'observabilityGroup'],
    count: 28,
  };
};

/**
 * Dashboard's add panel menu is populated
 * by ui_actions trigger ADD_PANEL_TRIGGER.
 * This test exists to ensures additions to menu
 * notify our team and can be reviewed by design.
 */
// Failing: See https://github.com/elastic/kibana/issues/268101
spaceTest.describe.skip(
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
    spaceTest.beforeAll(async ({ scoutSpace }) => {
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

    spaceTest('renders add panel flyout', async ({ pageObjects, config, log }) => {
      const expected = getExpected(config);

      await spaceTest.step('open new dashboard and add panel flyout', async () => {
        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.openAddPanelFlyout();
      });

      await spaceTest.step('verify panel groups', async () => {
        const groups = await pageObjects.dashboard.getAddPanelFlyoutGroups();
        // `mlGroup` and `logs-aiopsGroup` both declare order 0, so their relative
        // position is tie-broken by registration order and is not a contract.
        expect([...groups].sort()).toStrictEqual([...expected.groups].sort());
      });

      await spaceTest.step('verify total panel count', async () => {
        const addPanelActions = await pageObjects.dashboard.getAddPanelFlyoutActions();
        log.info(`Add panel actions: ${addPanelActions.join(',')}`);
        expect(
          addPanelActions,
          `add panel actions (${addPanelActions.length}): ${addPanelActions.join(', ')}`
        ).toHaveLength(expected.count);
      });
    });
  }
);
