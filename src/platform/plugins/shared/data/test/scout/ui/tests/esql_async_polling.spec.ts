/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CDPSession } from '@kbn/scout';
import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const DASHBOARD_FIXTURE_PATH =
  'src/platform/test/functional/fixtures/kbn_archiver/simple_slow_dash.json';
const ESQL_ASYNC_ENDPOINT = '/internal/search/esql_async';
const DASHBOARD_ID = '80d92ad1-ce0d-4567-81a0-a53987daf0f9';

test.describe('ES|QL Async Polling - HTTP/1', { tag: tags.stateful.classic }, () => {
  let cdp: CDPSession;
  let esqlAsyncRequestCount: number;

  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(DASHBOARD_FIXTURE_PATH);
  });

  test.beforeEach(async ({ browserAuth, page, context }) => {
    esqlAsyncRequestCount = 0;
    cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');

    page.on('request', (request) => {
      if (request.url().includes(ESQL_ASYNC_ENDPOINT)) {
        esqlAsyncRequestCount++;
      }
    });

    await browserAuth.loginAsViewer();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('loads dashboard with 5s async ES|QL query and polls multiple times', async ({
    pageObjects,
  }) => {
    // Open the dashboard (waitForRenderComplete is called internally)
    await pageObjects.dashboard.openDashboardWithId(DASHBOARD_ID);

    // HTTP/1 should make multiple sequential polling requests
    expect(
      esqlAsyncRequestCount,
      `HTTP/1 should make more than 2 requests (got ${esqlAsyncRequestCount})`
    ).toBeGreaterThan(2);
  });
});
