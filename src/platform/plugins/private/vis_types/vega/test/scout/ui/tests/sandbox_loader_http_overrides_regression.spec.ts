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

const SPEC = `{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "usermeta": {
    "embedOptions": {
      "loader": {
        "http": {
          "method": "POST",
          "headers": { "kbn-xsrf": "1" },
          "body": "{\\"probe\\":true}"
        }
      }
    }
  },
  "data": [
    { "name": "table", "url": "/api/vega_loader_http_probe" }
  ],
  "scales": [
    {
      "name": "x",
      "type": "band",
      "domain": { "data": "table", "field": "category" },
      "range": "width",
      "padding": 0.2
    },
    {
      "name": "y",
      "type": "linear",
      "domain": { "data": "table", "field": "amount" },
      "range": "height",
      "nice": true
    }
  ],
  "axes": [
    { "orient": "bottom", "scale": "x" },
    { "orient": "left", "scale": "y" }
  ],
  "marks": [
    {
      "name": "bars",
      "type": "rect",
      "from": { "data": "table" },
      "encode": {
        "enter": {
          "x": { "scale": "x", "field": "category" },
          "width": { "scale": "x", "band": 1 },
          "y": { "scale": "y", "field": "amount" },
          "y2": { "scale": "y", "value": 0 },
          "fill": { "value": "#1EA593" }
        }
      }
    }
  ]
}`;

test.describe('Vega loader HTTP overrides regression', { tag: tags.stateful.classic }, () => {
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

  test('blocks URL loading from sandboxed Vega', async ({ page, pageObjects }) => {
    let probeMethod: string | undefined;

    await page.route('**/api/vega_loader_http_probe', async (route) => {
      probeMethod = route.request().method();

      if (probeMethod === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET,POST,OPTIONS',
            'access-control-allow-headers': 'kbn-xsrf,content-type',
          },
          body: '',
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json',
        },
        body: JSON.stringify([{ category: 'jpg', amount: 1 }]),
      });
    });

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

    await expect(page.locator('iframe[title="Vega sandbox"]')).toHaveCount(1);
    await expect(page.getByText(/Vega sandbox warning: Loading failed/i)).toBeVisible({
      timeout: 30_000,
    });

    expect(probeMethod).toBeUndefined();
  });
});
