/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaCodeEditorWrapper, test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const VEGA_SANDBOXED_RENDERING_FLAG = 'vega.sandboxedRendering';
const VEGA_DASHBOARD_EMBEDDABLE_FLAG = 'vega.dashboardEmbeddable';

const SPEC = `{
  $schema: https://vega.github.io/schema/vega/v5.json

  data: [
    { name: table, values: [{ category: 'jpg', amount: 1 }] }
  ]

  signals: [
    {
      name: click
      on: [
        {
          events: '@bars:click'
          update: "kibanaAddFilter({ match_phrase: { extension: 'jpg' } }, 'kibana_sample_data_logs')"
        }
      ]
    }
  ]

  scales: [
    { name: x, type: band, domain: { data: table, field: category }, range: width, padding: 0.2 }
    { name: y, type: linear, domain: { data: table, field: amount }, range: height, nice: true }
  ]

  axes: [
    { orient: bottom, scale: x }
    { orient: left, scale: y }
  ]

  marks: [
    {
      name: bars
      type: rect
      from: { data: table }
      encode: {
        enter: {
          x: { scale: x, field: category }
          width: { scale: x, band: 1 }
          y: { scale: y, field: amount }
          y2: { scale: y, value: 0 }
          fill: { value: '#1EA593' }
        }
      }
    }
  ]
}`;

test.describe('Sandboxed Vega dashboard panel', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [VEGA_DASHBOARD_EMBEDDABLE_FLAG]: true,
        [VEGA_SANDBOXED_RENDERING_FLAG]: true,
      },
    });
    await apiServices.sampleData.install('logs');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.sampleData.remove('logs');
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [VEGA_DASHBOARD_EMBEDDABLE_FLAG]: null,
        [VEGA_SANDBOXED_RENDERING_FLAG]: null,
      },
    });
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
    await browserAuth.loginAsViewer();
  });

  test('renders, resizes, and applies filter via kibanaAddFilter', async ({ page, pageObjects }) => {
    const { dashboard, filterBar } = pageObjects;

    await dashboard.openNewDashboard();
    await dashboard.openAddPanelFlyout();

    await page.testSubj.locator('dashboardPanelSelectionFlyout__searchInput').fill('Vega');
    await expect(page.testSubj.locator('create-action-Vega')).toBeVisible();
    await page.testSubj.click('create-action-Vega');

    const codeEditor = new KibanaCodeEditorWrapper(page);
    await codeEditor.waitCodeEditorReady('vega-editor');
    await codeEditor.setCodeEditorValue(SPEC);
    await page.testSubj.click('vegaEditorFlyoutSaveButton');

    const sandboxFrame = page.locator('iframe[title="Vega sandbox"]');
    await expect(sandboxFrame).toHaveCount(1);

    const canvas = page.frameLocator('iframe[title="Vega sandbox"]').locator('canvas');
    await expect(canvas).toBeVisible();

    const widthBefore = await canvas.evaluate((el) => (el as HTMLCanvasElement).width);

    await page.setViewportSize({ width: 820, height: 700 });
    await expect
      .poll(() => canvas.evaluate((el) => (el as HTMLCanvasElement).width))
      .not.toBe(widthBefore);

    expect(await filterBar.getFilterCount()).toBe(0);
    await canvas.click();
    await expect.poll(() => filterBar.getFilterCount()).toBe(1);
  });
});

