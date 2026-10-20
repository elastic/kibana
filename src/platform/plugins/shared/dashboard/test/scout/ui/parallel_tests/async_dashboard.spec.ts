/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TEMPORARY screenshot harness for PR #298989 — do not commit.

import path from 'path';
import type { ScoutPage } from '@kbn/scout';
import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const OUT_DIR = process.env.DARK_MODE_SHOTS_DIR ?? '/tmp/dark-mode-shots';
const LABEL = process.env.DARK_MODE_SHOTS_LABEL ?? 'unlabeled';

const shot = (name: string) => path.join(OUT_DIR, `${LABEL}-${name}.png`);

const SAMPLE_DASHBOARDS = {
  flights: '7adfa750-4c81-11e8-b3d7-01146121b73d',
  logs: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
} as const;

async function toggleToDarkMode(page: ScoutPage) {
  const expand = page.getByRole('button', { name: 'Expand developer toolbar' });
  if (await expand.isVisible()) {
    await expand.click();
  }
  const toggle = page.getByRole('button', { name: 'Toggle color theme' });
  await expect(toggle).toHaveText('Light');
  await toggle.click();
  await expect(toggle).toHaveText('Dark');
}

async function settle(page: ScoutPage) {
  await expect(page.locator('[data-render-complete="false"]')).toHaveCount(0, { timeout: 30_000 });
  // Map tiles and canvas repaints have no render-complete signal.
  await page.waitForTimeout(4000);
}

const panel = (page: ScoutPage, title: string) =>
  page.testSubj.locator('embeddablePanel').filter({ has: page.getByText(title, { exact: true }) });

spaceTest.describe('Dark mode toggle screenshots', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await apiServices.sampleData.install('flights', scoutSpace.id);
    await apiServices.sampleData.install('logs', scoutSpace.id);
  });

  spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
    await apiServices.sampleData.remove('flights', scoutSpace.id);
    await apiServices.sampleData.remove('logs', scoutSpace.id);
  });

  spaceTest('flights dashboard after toggling to dark', async ({ browserAuth, page, pageObjects }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.openDashboardWithId(SAMPLE_DASHBOARDS.flights);
    await settle(page);

    await toggleToDarkMode(page);
    await settle(page);

    const metricBackgrounds = await page
      .locator('[data-test-subj="mtrVis"] .echMetric')
      .evaluateAll((cards) => cards.map((c) => (c as HTMLElement).style.backgroundColor));
    // eslint-disable-next-line no-console
    console.log(`[${LABEL}] flights metric backgrounds: ${JSON.stringify(metricBackgrounds)}`);

    await page.screenshot({ path: shot('flights-top') });
    await panel(page, '[Flights] Airport Connections (Hover Over Airport)').screenshot({
      path: shot('flights-vega-map'),
    });
  });

  spaceTest('logs dashboard after toggling to dark', async ({ browserAuth, page, pageObjects }) => {
    await page.setViewportSize({ width: 1600, height: 1600 });
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.openDashboardWithId(SAMPLE_DASHBOARDS.logs);
    await settle(page);

    await toggleToDarkMode(page);
    await settle(page);

    await panel(page, '[Logs] Machine OS and Destination Sankey Chart').screenshot({
      path: shot('logs-vega-sankey'),
    });
  });
});
