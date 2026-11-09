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
  ALL_TIMESTAMPS_DESC,
  CLASSIC_NAV_DEPLOYMENTS,
  CONTEXT_AWARENESS_DATA_VIEWS,
  GRID_VIEWPORT,
  LOGS_LEVELS_DESC,
  LOGS_TIMESTAMPS_DESC,
} from '../fixtures';

/**
 * Cell renderers are contributed by two profile layers at once: `example-root-profile` renders
 * `@timestamp` for any source, while `example-data-source-profile` renders `log.level` only for
 * `my-example-logs`. Querying `my-example-*` resolves the root profile alone, so the timestamp
 * renderer applies and the log level one must not — the assertion is about which layer won, which
 * is why this runs in a browser rather than as a component test.
 *
 * Classic navigation only: `example-root-profile` bails out once a solution view is active, so the
 * custom timestamp renderer never applies there. The solution view side is covered by
 * get_cell_renderers_esql_solution_view.spec.ts.
 */
spaceTest.describe(
  'Discover context awareness - extension getCellRenderers, ES|QL mode',
  { tag: CLASSIC_NAV_DEPLOYMENTS },
  () => {
    // Needed by 'root profile renders a custom timestamp field': it runs on the default summary
    // column, whose height means the shorter default viewport virtualises away two of the six rows,
    // leaving the whole-result-set assertion to undercount.
    spaceTest.use({ viewport: GRID_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest('root profile renders a custom timestamp field', async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.goto({ queryMode: 'esql' });
      await discover.writeAndSubmitEsqlQuery(
        `from ${CONTEXT_AWARENESS_DATA_VIEWS.ALL} | sort @timestamp desc`
      );

      await expect(page.testSubj.locator('exampleRootProfileTimestamp')).toHaveText(
        ALL_TIMESTAMPS_DESC
      );
    });

    spaceTest(
      'data source profile renders a custom timestamp field but not a custom log.level',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.ALL} | sort @timestamp desc`
        );

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

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc`
        );

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
