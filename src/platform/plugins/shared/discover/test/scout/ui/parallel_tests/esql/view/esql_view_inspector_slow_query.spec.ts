/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The Inspector's "Table" + "Visualization" request pair stays as a single
 * entry each even when the underlying ES|QL query is slow.
 *
 * Stateful-only: the slow-query simulation relies on the ES `error_query`
 * test feature (see `ELASTIC_ESQL_DELAY_SECONDS` in
 * `src/platform/plugins/shared/data/common/search/expressions/esql.ts`),
 * which is only enabled on stateful ES snapshot builds — serverless ES
 * rejects the injected filter with an `x_content_parse_exception`.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures';
import { testData } from '../../../fixtures/common';
import {
  getInspectorRequestTotalTime,
  hasInspectorRequest,
  switchToRequestsView,
} from '../../../fixtures/esql/inspector_helpers';

declare global {
  interface Window {
    ELASTIC_ESQL_DELAY_SECONDS?: number;
  }
}

const AGG_QUERY = 'from logstash-* | sort @timestamp';

// Simulated ES|QL round-trip delay (see
// `src/platform/plugins/shared/data/common/search/expressions/esql.ts`).
const ESQL_DELAY_SECONDS = 1;

spaceTest.describe(
  'Discover ES|QL view - inspector, slow query',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'keeps a single Table/Visualization entry each for a slow query',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.codeEditor.setCodeEditorValue(AGG_QUERY);

        // Simulate a slow ES|QL round-trip (debug setting, see
        // `src/platform/plugins/shared/data/common/search/expressions/esql.ts`)
        // to assert the "Table"/"Visualization" requests aren't duplicated by
        // the slow response.
        await page.evaluate((delaySeconds) => {
          window.ELASTIC_ESQL_DELAY_SECONDS = delaySeconds;
        }, ESQL_DELAY_SECONDS);
        await discover.submitQuery();
        await discover.waitUntilTabIsLoaded();
        await discover.waitForHistogramRendered();
        await page.evaluate(() => {
          window.ELASTIC_ESQL_DELAY_SECONDS = undefined;
        });
        await discover.openInspectorFromTabMenu();
        await switchToRequestsView(page);
        await expect.poll(() => hasInspectorRequest(page, 'Table')).toBe(true);
        await expect.poll(() => hasInspectorRequest(page, 'Visualization')).toBe(true);
        const chooser = page.testSubj.locator('inspectorRequestChooser');
        await chooser.click();
        await expect(page.testSubj.locator('inspectorRequestChooserTable')).toHaveCount(1);
        await expect(page.testSubj.locator('inspectorRequestChooserVisualization')).toHaveCount(1);
        const requestTotalTime = await getInspectorRequestTotalTime(page);
        expect(requestTotalTime).toBeGreaterThan(ESQL_DELAY_SECONDS * 1000);
      }
    );
  }
);
