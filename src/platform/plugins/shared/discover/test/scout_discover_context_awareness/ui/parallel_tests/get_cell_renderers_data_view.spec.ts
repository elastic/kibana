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
  setupContextAwareness,
  teardownContextAwareness,
  ALL_TIMESTAMPS_DESC,
  CONTEXT_AWARENESS_DATA_VIEWS,
  GRID_VIEWPORT,
  LOGS_LEVELS_DESC,
  LOGS_TIMESTAMPS_DESC,
} from '../fixtures';

/**
 * Same profile-layering assertions as the ES|QL cases, but reached by selecting a data view instead
 * of writing a query: the resolved data source has to drive the cell renderers identically in both
 * modes. `my-example-*` resolves `example-root-profile` alone, so `@timestamp` gets the custom
 * renderer and `log.level` does not; `my-example-logs` also resolves
 * `example-data-source-profile`, which adds the log level renderer.
 */
spaceTest.describe(
  'Discover context awareness - extension getCellRenderers, data view mode',
  { tag: tags.deploymentAgnostic },
  () => {
    // Needed by the default-columns case: its tall summary column means the shorter default
    // viewport virtualises away two of the six rows, so the whole-result-set assertion undercounts.
    spaceTest.use({ viewport: GRID_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'classic' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest('root profile renders a custom timestamp field', async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.ALL, {
        createAdHocIfMissing: false,
      });
      await discover.waitUntilSearchingHasFinished();

      await expect(page.testSubj.locator('exampleRootProfileTimestamp')).toHaveText(
        ALL_TIMESTAMPS_DESC
      );
    });

    spaceTest(
      'data source profile renders a custom timestamp field but not a custom log.level',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.ALL, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await unifiedFieldList.clickFieldListItemAdd('@timestamp');
        await unifiedFieldList.clickFieldListItemAdd('log.level');

        await expect(page.testSubj.locator('exampleRootProfileTimestamp')).toHaveText(
          ALL_TIMESTAMPS_DESC
        );
        await expect(page.testSubj.locator('exampleDataSourceProfileLogLevel')).toHaveCount(0);
      }
    );

    spaceTest(
      'data source profile renders a custom timestamp field and a custom log.level',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await unifiedFieldList.clickFieldListItemAdd('@timestamp');
        await unifiedFieldList.clickFieldListItemAdd('log.level');

        await expect(page.testSubj.locator('exampleRootProfileTimestamp')).toHaveText(
          LOGS_TIMESTAMPS_DESC
        );
        await expect(page.testSubj.locator('exampleDataSourceProfileLogLevel')).toHaveText(
          LOGS_LEVELS_DESC
        );
      }
    );
  }
);
