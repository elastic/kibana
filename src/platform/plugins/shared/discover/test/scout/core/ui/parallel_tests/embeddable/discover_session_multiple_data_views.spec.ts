/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../../common/ui/fixtures';

const DASHBOARD_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana';
const DASHBOARD_TITLE = 'discover session multiple data views';
const IGNORE_FILTER_SETTING = 'courier:ignoreFilterIfFieldNotInIndex';

spaceTest.describe(
  'Discover session with multiple data views',
  { tag: '@local-stateful-classic' },
  () => {
    let animalsIndex: string;
    let dashboardId: string;

    spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
      animalsIndex = `animals-discover-embeddable-${scoutSpace.id}`;
      await esClient.index({
        index: animalsIndex,
        refresh: 'wait_for',
        document: {
          '@timestamp': new Date().toISOString(),
          animal: 'dog',
        },
      });

      const savedObjects = await scoutSpace.savedObjects.load(DASHBOARD_ARCHIVE);
      const dashboard = savedObjects.find(
        ({ type, title }) => type === 'dashboard' && title === DASHBOARD_TITLE
      );
      if (!dashboard) {
        throw new Error('Multiple data views dashboard was not imported');
      }

      dashboardId = dashboard.id;
      await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
    });

    spaceTest.beforeEach(async ({ browserAuth, scoutSpace }) => {
      await scoutSpace.uiSettings.unset(IGNORE_FILTER_SETTING);
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', IGNORE_FILTER_SETTING);
      await scoutSpace.savedObjects.cleanStandardList();
      await esClient.indices.delete({ index: animalsIndex, ignore_unavailable: true });
    });

    spaceTest(
      'does not ignore a filter from another data view by default',
      async ({ page, pageObjects }) => {
        await pageObjects.dashboard.openDashboardWithId(dashboardId);

        await expect(page.testSubj.locator('embeddedSavedSearchDocTable')).toHaveText(
          'No results found'
        );
      }
    );

    spaceTest(
      'ignores a filter from another data view when configured',
      async ({ pageObjects, scoutSpace }) => {
        await scoutSpace.uiSettings.set({ [IGNORE_FILTER_SETTING]: true });
        await pageObjects.dashboard.openDashboardWithId(dashboardId);

        await expect.poll(() => pageObjects.dashboard.getSavedSearchRowCount()).toBeGreaterThan(0);
      }
    );
  }
);
