/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as delay } from 'timers/promises';
import { expect } from '@kbn/scout/ui';
import type { DiscoverPageObjects } from '../fixtures';
import { spaceTest, tags } from '../fixtures';

const SEARCH_DELAY_MS = 5_000;
// Search start only; delaying the polls inflates `pollSearch`'s back-off instead.
const isEsqlSearchStart = (url: URL) => url.pathname.endsWith('/internal/search/esql_async');

/**
 * Opens the inspector's Requests view and asserts the listed request names, leaving
 * the panel open. Reopens rather than waiting on the open panel: `getInspectorRequestAdapters`
 * (use_inspector.ts) freezes the set of adapters when the panel opens, and the chart
 * publishes its adapter only once its own search has loaded — so a panel opened too
 * early never picks the visualization entry up, however long it stays open.
 */
const expectRequestNames = async (
  { inspector, unifiedTabs }: Pick<DiscoverPageObjects, 'inspector' | 'unifiedTabs'>,
  names: string[]
) => {
  await expect
    .poll(async () => {
      if (await inspector.panel.isVisible()) {
        await inspector.close();
      }
      await unifiedTabs.openInspectorForActiveTab();
      await inspector.openInspectorRequestsView();
      return inspector.getRequestNames();
    })
    .toStrictEqual(names);
};

// Tagged per test rather than on the describe: Playwright accumulates a test's tags with
// its parents', so a describe-level tag set cannot be narrowed by an individual test.
spaceTest.describe('Discover ES|QL inspector', () => {
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
    'lists the Table and Visualization requests',
    { tag: tags.deploymentAgnostic },
    async ({ pageObjects }) => {
      const { discover, inspector, unifiedTabs } = pageObjects;

      // the observability root profile overrides it to `FROM <allLogsIndexPattern>`
      // so the requests below would not be logstash's.
      await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 10');

      await expectRequestNames({ inspector, unifiedTabs }, ['Table', 'Visualization']);

      await inspector.requests.requestTab.click();
      const request = await discover.codeEditor.getCodeEditorValueByTestSubj(
        'inspectorRequestCodeViewerContainer'
      );
      expect(request).toContain('POST /_query/async?drop_null_columns=true');
    }
  );

  // Stateful classic only, matching where the FTR original ran: its `with slow queries`
  // suite existed solely in the stateful file, whose config was registered in
  // `ftr_platform_stateful_configs.yml`. The serverless mirror never carried it.
  spaceTest(
    'registers one entry per request when the search is slow',
    { tag: tags.stateful.classic },
    async ({ page, pageObjects }) => {
      const { discover, inspector, unifiedTabs } = pageObjects;

      // Delay the search at the network layer rather than stalling it in ES with the
      // `error_query` hook the FTR original used: that hook is snapshot-only, and its
      // stall costs ~3x the configured delay.
      await page.route(isEsqlSearchStart, async (route) => {
        await delay(SEARCH_DELAY_MS);
        await route.continue();
      });

      await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 10');
      await discover.waitUntilTabIsLoaded();

      // Async-search polling must not register a second entry per request, so this
      // settles at exactly these two however many polls it took to resolve them.
      await expectRequestNames({ inspector, unifiedTabs }, ['Table', 'Visualization']);

      // Confirms the delay was actually in force for the reported request.
      expect(await inspector.getRequestTotalTime()).toBeGreaterThan(SEARCH_DELAY_MS);
    }
  );
});
