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

test.describe('Content Management Examples - Finder', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.sampleData.install('flights');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.sampleData.remove('flights');
  });

  test('Finder demo displays saved objects from sample data', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.get('/app/contentManagementExamples/finder'));

    await expect(page.testSubj.locator('finderExample')).toBeVisible();
    await expect(page.testSubj.locator('savedObjectsFinderTable')).toBeVisible();

    const titleElements = page.testSubj.locator('savedObjectFinderTitle');
    await expect.poll(() => titleElements.count()).toBeGreaterThan(0);

    const titles = (await titleElements.locator('.euiLink').allTextContents()).filter(Boolean);

    const expectedItems = [
      'Kibana Sample Data Flights',
      '[Flights] Airport Connections (Hover Over Airport)',
      '[Flights] Departures Count Map',
      '[Flights] Origin Time Delayed',
      '[Flights] Flight Log',
    ];

    for (const item of expectedItems) {
      expect(titles).toContain(item);
    }
  });
});
