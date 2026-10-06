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
 * The solution view counterpart of get_cell_renderers_esql.spec.ts. Where a solution view is
 * active, `example-root-profile` declines to match and `example-solution-view-root-profile` takes
 * over — and that provider contributes no cell renderers at all, so the custom `@timestamp` never
 * renders however the data source resolves.
 *
 * `example-data-source-profile` has no such guard, so `log.level` still gets its renderer for
 * `my-example-logs`. Asserting both halves in the same test is the point: it pins which layer
 * dropped out and which survived.
 */
spaceTest.describe(
  'Discover context awareness - extension getCellRenderers under a solution view, ES|QL mode',
  { tag: SOLUTION_VIEW_DEPLOYMENTS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'root profile does not render a custom timestamp field',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.ALL} | sort @timestamp desc`
        );

        await expect(page.testSubj.locator('exampleRootProfileTimestamp')).toHaveCount(0);
      }
    );

    spaceTest(
      'renders neither a custom timestamp field nor a custom log.level',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.ALL} | sort @timestamp desc`
        );

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

        await discover.writeAndSubmitEsqlQuery(
          `from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS} | sort @timestamp desc`
        );

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
