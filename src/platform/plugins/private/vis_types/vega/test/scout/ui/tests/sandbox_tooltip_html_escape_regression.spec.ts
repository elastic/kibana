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
const VEGA_STANDALONE_EMBEDDABLE_FLAG = 'vega.standaloneEmbeddable';

const TOOLTIP_PAYLOAD = '<img src=x onerror=alert(1)>';

const SPEC = `{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "config": {
    "kibana": {
      "tooltips": { "position": "top", "padding": 16, "centerOnMark": 50 }
    }
  },
  "data": [{ "name": "table", "values": [{ "v": 1 }] }],
  "marks": [
    {
      "type": "rect",
      "from": { "data": "table" },
      "encode": {
        "enter": {
          "x": { "value": 0 },
          "x2": { "signal": "width" },
          "y": { "value": 0 },
          "y2": { "signal": "height" },
          "fill": { "value": "#1EA593" },
          "tooltip": { "signal": "{ a: '${TOOLTIP_PAYLOAD}', b: 'ok' }" }
        }
      }
    }
  ]
}`;

test.describe('Vega sandbox tooltip HTML escaping', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [VEGA_STANDALONE_EMBEDDABLE_FLAG]: true,
        [VEGA_SANDBOXED_RENDERING_FLAG]: true,
      },
    });
    await apiServices.sampleData.install('logs');
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.sampleData.remove('logs');
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [VEGA_STANDALONE_EMBEDDABLE_FLAG]: null,
        [VEGA_SANDBOXED_RENDERING_FLAG]: null,
      },
    });
  });

  test('renders tooltip content and does not create HTML elements from values', async ({
    page,
    pageObjects,
  }) => {
    const { dashboard } = pageObjects;

    await dashboard.openNewDashboard();
    await dashboard.openAddPanelFlyout();

    await page.testSubj.locator('dashboardPanelSelectionFlyout__searchInput').fill('Vega');
    await expect(page.testSubj.locator('create-action-Vega')).toBeVisible();
    await page.testSubj.click('create-action-Vega');

    const codeEditor = new KibanaCodeEditorWrapper(page);
    await codeEditor.waitCodeEditorReady('vega-editor');
    await codeEditor.setCodeEditorValue(SPEC);
    await page.testSubj.click('vegaEditorFlyoutSaveButton');

    const frame = page.frameLocator('iframe[title="Vega sandbox"]');
    await expect(page.locator('iframe[title="Vega sandbox"]')).toHaveCount(1);

    const canvas = frame.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    await canvas.hover({ position: { x: 5, y: 5 } });

    const tooltip = frame.locator('#vega-kibana-sandbox-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 30_000 });
    await expect(tooltip.locator('table')).toHaveCount(1);
    await expect(tooltip.locator('img')).toHaveCount(0);
    await expect(tooltip).toContainText(TOOLTIP_PAYLOAD);
    await expect(tooltip).toContainText('ok');
  });
});
