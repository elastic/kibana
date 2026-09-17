/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  setupContextAwareness,
  teardownContextAwareness,
  CONTEXT_AWARENESS_DATA_VIEWS,
  LOGS_LEVELS_DESC,
  SOLUTION_VIEW_DEPLOYMENTS,
} from '../fixtures';

/**
 * The solution view counterpart of get_cell_renderers_data_view.spec.ts: with
 * `example-solution-view-root-profile` resolved in place of `example-root-profile`, no cell
 * renderer is contributed at the root layer, so the custom `@timestamp` is absent for every data
 * view. `example-data-source-profile` is unaffected and still renders `log.level` for
 * `my-example-logs`.
 */
spaceTest.describe(
  'Discover context awareness - extension getCellRenderers under a solution view, data view mode',
  { tag: SOLUTION_VIEW_DEPLOYMENTS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto({ queryMode: 'classic' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'root profile does not render a custom timestamp field',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.ALL, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();

        await expect(page.testSubj.locator('exampleRootProfileTimestamp')).toHaveCount(0);
      }
    );

    spaceTest(
      'renders neither a custom timestamp field nor a custom log.level',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.ALL, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await unifiedFieldList.clickFieldListItemAdd('@timestamp');
        await unifiedFieldList.clickFieldListItemAdd('log.level');

        await expect(page.testSubj.locator('exampleRootProfileTimestamp')).toHaveCount(0);
        await expect(page.testSubj.locator('exampleDataSourceProfileLogLevel')).toHaveCount(0);
      }
    );

    spaceTest(
      'data source profile renders a custom log.level but still no custom timestamp field',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await unifiedFieldList.clickFieldListItemAdd('@timestamp');
        await unifiedFieldList.clickFieldListItemAdd('log.level');

        await expect(page.testSubj.locator('exampleRootProfileTimestamp')).toHaveCount(0);
        await expect(page.testSubj.locator('exampleDataSourceProfileLogLevel')).toHaveText(
          LOGS_LEVELS_DESC
        );
      }
    );
  }
);
