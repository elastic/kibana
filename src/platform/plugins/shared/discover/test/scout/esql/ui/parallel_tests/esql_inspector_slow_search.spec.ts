/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Inspector behaviour under a slow ES|QL search. Split out from `esql_inspector.spec.ts`
 * so the deployment scope can live on the describe: this covers the FTR suite's
 * `with slow queries` block, which only ever ran on stateful classic — its config was
 * registered in `ftr_platform_stateful_configs.yml` and the serverless mirror never
 * carried it. It is also unstable on serverless observability, where the histogram's
 * request does not reliably register while the search is delayed.
 */

import { setTimeout as delay } from 'timers/promises';
import { expect } from '@kbn/scout/ui';
import { expectRequestNames, spaceTest, tags } from '../fixtures';

const SEARCH_DELAY_MS = 5_000;
// Search start only; delaying the polls inflates `pollSearch`'s back-off instead.
const isEsqlSearchStart = (url: URL) => url.pathname.endsWith('/internal/search/esql_async');

spaceTest.describe(
  'Discover ES|QL inspector with a slow search',
  { tag: tags.stateful.classic },
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

    spaceTest('registers one entry per request', async ({ page, pageObjects }) => {
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
    });
  }
);
