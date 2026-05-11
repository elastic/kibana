/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

test.describe('Content Management Examples - MSearch', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.sampleData.install('flights');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.sampleData.remove('flights');
  });

  test('MSearch demo displays sample flights data', async ({
    browserAuth,
    page,
    pageObjects,
    kbnUrl,
  }) => {
    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.get('/app/contentManagementExamples/msearch'));

    await expect(page.testSubj.locator('msearchExample')).toBeVisible();
    await pageObjects.listingTable.waitUntilTableIsLoaded();

    const expectedItems = [
      'kibana_sample_data_flights',
      '[Flights] Airport Connections (Hover Over Airport)',
      '[Flights] Departures Count Map',
      '[Flights] Origin Time Delayed',
      '[Flights] Flight Log',
    ];

    await expect
      .poll(() => pageObjects.listingTable.getAllItemsNames())
      .toEqual(expect.arrayContaining(expectedItems));
  });
});
