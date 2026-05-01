/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CDPSession } from '@kbn/scout';
import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const DASHBOARD_FIXTURE_PATH =
  'src/platform/test/functional/fixtures/kbn_archiver/simple_slow_dash.json';
const ESQL_ASYNC_ENDPOINT = '/internal/search/esql_async';

spaceTest.describe('ES|QL Async Polling - HTTP/2', { tag: tags.deploymentAgnostic }, () => {
  let cdp: CDPSession;
  let esqlAsyncRequestCount: number;
  let dashboardId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(DASHBOARD_FIXTURE_PATH);
    dashboardId = imported[0].id;
  });

  spaceTest.beforeEach(async ({ browserAuth, page, context }) => {
    esqlAsyncRequestCount = 0;
    cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');

    page.on('request', (request) => {
      if (request.url().includes(ESQL_ASYNC_ENDPOINT)) {
        esqlAsyncRequestCount++;
      }
    });

    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'loads dashboard with 5s async ES|QL query and polls exactly twice',
    async ({ pageObjects }) => {
      // Open the dashboard (waitForRenderComplete is called internally)
      await pageObjects.dashboard.openDashboardWithId(dashboardId);

      // HTTP/2 should make exactly 2 requests (initial + one poll with multiplexing)
      expect(
        esqlAsyncRequestCount,
        `HTTP/2 should make exactly 2 requests (got ${esqlAsyncRequestCount})`
      ).toBe(2);
    }
  );
});
