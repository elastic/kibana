/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const SAMPLE_DATA_SETS = ['flights', 'logs', 'ecommerce'] as const;
type SampleDataSetId = (typeof SAMPLE_DATA_SETS)[number];

const EXPECTED_PANEL_COUNTS: Record<SampleDataSetId, number> = {
  flights: 16,
  logs: 12,
  ecommerce: 14,
};

test.describe('Sample data', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await Promise.all(SAMPLE_DATA_SETS.map((id) => apiServices.sampleData.install(id)));
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
    await browserAuth.loginAsViewer();
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.all(SAMPLE_DATA_SETS.map((id) => apiServices.sampleData.remove(id)));
  });

  test('displays all registered sample data sets', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/home#/tutorial_directory/sampleData'));

    for (const id of SAMPLE_DATA_SETS) {
      await expect(page.testSubj.locator(`sampleDataSetCard${id}`)).toBeVisible();
    }
  });

  test('launches sample dashboards with expected panel counts', async ({ page, kbnUrl }) => {
    for (const id of SAMPLE_DATA_SETS) {
      await test.step(`${id}: open dashboard and verify ${EXPECTED_PANEL_COUNTS[id]} panels`, async () => {
        await page.goto(kbnUrl.get('/app/home#/tutorial_directory/sampleData'));
        await page.testSubj.locator(`launchSampleDataSet${id}`).click();
        await page.testSubj.locator(`viewSampleDataSet${id}-dashboard`).click();
        await expect(page.testSubj.locator('dashboardPanel')).toHaveCount(
          EXPECTED_PANEL_COUNTS[id]
        );
      });
    }
  });

  test('flights dashboard renders visualizations correctly', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/home#/tutorial_directory/sampleData'));
    await expect(page.testSubj.locator('launchSampleDataSetflights')).toBeVisible();
    await page.testSubj.locator('launchSampleDataSetflights').click();
    await page.testSubj.locator('viewSampleDataSetflights-dashboard').click();

    await test.step('panels finish rendering', async () => {
      await expect(page.testSubj.locator('dashboardPanel')).toHaveCount(
        EXPECTED_PANEL_COUNTS.flights
      );
    });

    await test.step('at least one XY chart has rendered', async () => {
      await expect(
        page.locator(
          '[data-test-subj="xyVisChart"] .echChartStatus[data-ech-render-complete="true"]'
        )
      ).not.toHaveCount(0);
    });

    await test.step('saved search has data', async () => {
      await expect(page.locator('[data-document-number]')).not.toHaveCount(0);
    });

    await test.step('controls are rendered', async () => {
      await expect(page.testSubj.locator('control-frame')).toHaveCount(3);
    });
  });
});
