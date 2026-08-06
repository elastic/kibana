/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The Inspector must not duplicate the "Table"/"Visualization" entries when an
 * ES|QL query is slow (mirrors the FTR `with slow queries` test). Failed
 * attempts may additionally be listed when the visualization request is
 * retried, so only the successful entries are counted here.
 *
 * Stateful-only: the slow-query simulation relies on the ES `error_query`
 * test feature (see `ELASTIC_ESQL_DELAY_SECONDS` in
 * `src/platform/plugins/shared/data/common/search/expressions/esql.ts`),
 * which is only enabled on stateful ES snapshot builds — serverless ES
 * rejects the injected filter with an `x_content_parse_exception`.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures';
import {
  getInspectorRequestNames,
  getInspectorRequestTotalTime,
  selectInspectorRequest,
  switchToRequestsView,
} from '../../fixtures/inspector_helpers';

declare global {
  interface Window {
    ELASTIC_ESQL_DELAY_SECONDS?: number;
  }
}

const SLOW_QUERY = 'from logstash-* | sort @timestamp';

// Simulated ES|QL round-trip delay, matching the FTR test it replaces (see
// `src/platform/plugins/shared/data/common/search/expressions/esql.ts`).
const ESQL_DELAY_SECONDS = 5;

spaceTest.describe(
  'Discover ES|QL view - inspector, slow query',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'shows a single table and visualization request for a slow query',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.codeEditor.setCodeEditorValue(SLOW_QUERY);

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

        // Failed attempts ("Visualization (failed)") may or may not be listed
        // depending on how the slow response is retried, so assert on the
        // successful entries only — those are the ones that must not be
        // duplicated by the delayed response.
        await expect
          .poll(
            async () => {
              const names = await getInspectorRequestNames(page);
              return {
                table: names.filter((name) => name === 'Table').length,
                visualization: names.filter((name) => name === 'Visualization').length,
              };
            },
            { timeout: 30_000 }
          )
          .toStrictEqual({ table: 1, visualization: 1 });

        await selectInspectorRequest(page, 'Table');
        const requestTotalTime = await getInspectorRequestTotalTime(page);
        expect(requestTotalTime).toBeGreaterThan(ESQL_DELAY_SECONDS * 1000);
      }
    );
  }
);
