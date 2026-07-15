/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL requests surfaced in the Inspector, including the "Table" +
 * "Visualization" request pair staying as a single entry each even when the
 * underlying query is slow.
 */

import { tags, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures';
import { testData } from '../../../fixtures/common';

declare global {
  interface Window {
    ELASTIC_ESQL_DELAY_SECONDS?: number;
  }
}

const AGG_QUERY =
  'from logstash-* | sort @timestamp | limit 10 | stats countB = count(bytes) by geo.dest | sort countB';

spaceTest.describe('Discover ES|QL view - inspector', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows Discover and Lens requests in the inspector', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    await discover.codeEditor.setCodeEditorValue(AGG_QUERY);

    // A small artificial delay (debug setting, see
    // `src/platform/plugins/shared/data/common/search/expressions/esql.ts`)
    // gives the separate Lens "Visualization" request time to actually fire
    // before the query resolves - without it, a fast local query can
    // complete (and the inspector can be opened) before that request has
    // been dispatched.
    await page.evaluate(() => {
      window.ELASTIC_ESQL_DELAY_SECONDS = 2;
    });
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();

    // This result shape is grouped by default ("cascade layout"), which
    // doesn't fetch a separate Lens "Visualization" request; opt out so the
    // flat grid (and its XY chart) render instead.
    await discover.optOutOfCascadeGrouping();
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible({ timeout: 10_000 });

    await page.evaluate(() => {
      window.ELASTIC_ESQL_DELAY_SECONDS = undefined;
    });

    await discover.openInspectorFromTabMenu();
    await switchToRequestsView(page);

    // The "Table" request (doc/stats data) resolves first; the "Visualization"
    // request (Lens' own data fetch for the chart) can complete slightly
    // later, so poll the already-open inspector rather than re-submitting
    // the query. CI runners can be slower than a local dev machine, so both
    // checks get extra headroom above the default assertion timeout.
    await expect.poll(() => hasInspectorRequest(page, 'Table'), { timeout: 15_000 }).toBe(true);
    await expect
      .poll(() => hasInspectorRequest(page, 'Visualization'), { timeout: 15_000 })
      .toBe(true);

    // Verify the Table request is routed to the async ES|QL endpoint.
    const command = await getInspectorRequestCommand(page, 'Table');
    expect(normalizeInspectorCommand(command)).toBe('POST /_query/async?drop_null_columns=true');
  });

  spaceTest(
    'keeps a single Table/Visualization entry each for a slow query',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.codeEditor.setCodeEditorValue(AGG_QUERY);

      // Simulate a slow ES|QL round-trip (debug setting, see
      // `src/platform/plugins/shared/data/common/search/expressions/esql.ts`)
      // to assert the "Table"/"Visualization" requests aren't duplicated by
      // the slow response.
      await page.evaluate(() => {
        window.ELASTIC_ESQL_DELAY_SECONDS = 5;
      });
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await discover.optOutOfCascadeGrouping();
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible({ timeout: 20_000 });

      await page.evaluate(() => {
        window.ELASTIC_ESQL_DELAY_SECONDS = undefined;
      });

      await discover.openInspectorFromTabMenu();
      await switchToRequestsView(page);
      // The slow query (5 s delay) + CI overhead needs more headroom than the first test.
      await expect.poll(() => hasInspectorRequest(page, 'Table'), { timeout: 30_000 }).toBe(true);
      await expect
        .poll(() => hasInspectorRequest(page, 'Visualization'), { timeout: 30_000 })
        .toBe(true);

      // Exactly one "Table" and one "Visualization" entry - never duplicated
      // by the slow round-trip (a duplicate would render a second element
      // with the same test subject).
      const chooser = page.testSubj.locator('inspectorRequestChooser');
      await chooser.click();
      await expect(page.testSubj.locator('inspectorRequestChooserTable')).toHaveCount(1);
      await expect(page.testSubj.locator('inspectorRequestChooserVisualization')).toHaveCount(1);
      await page.keyboard.press('Escape');
    }
  );
});

/**
 * Selects the named request from the inspector's chooser combo box, clicks
 * the "Request" tab to show the raw HTTP command, and returns the first line
 * of the code viewer (i.e. the HTTP method + path, before the JSON body).
 */
const getInspectorRequestCommand = async (
  page: ScoutPage,
  requestName: string
): Promise<string> => {
  const chooser = page.testSubj.locator('inspectorRequestChooser');
  await expect(chooser).toBeVisible();
  await chooser.click();
  await page.testSubj.click(`inspectorRequestChooser${requestName}`);
  await page.testSubj.click('inspectorRequestDetailRequest');
  const codeViewer = page.testSubj.locator('inspectorRequestCodeViewerContainer');
  await expect(codeViewer).toBeVisible();
  const text = await codeViewer.innerText();
  return text.split('\n')[0].trim();
};

const normalizeInspectorCommand = (value: string): string => {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
};

/**
 * Switches the inspector to the "Requests" view if it isn't already showing
 * it (the view chooser is only rendered when more than one view exists).
 */
const switchToRequestsView = async (page: ScoutPage): Promise<void> => {
  const viewChooser = page.testSubj.locator('inspectorViewChooser');
  if (!(await viewChooser.isVisible())) {
    return;
  }
  await viewChooser.click();
  await page.testSubj.click('inspectorViewChooserRequests');
};

/**
 * Checks whether the inspector's request chooser combo box has a request
 * named `name`, identified by its own `inspectorRequestChooser<Name>` test
 * subject rendered in the dropdown (see `RequestSelector.renderRequestCombobox`).
 */
const hasInspectorRequest = async (page: ScoutPage, name: string): Promise<boolean> => {
  const chooser = page.testSubj.locator('inspectorRequestChooser');
  await expect(chooser).toBeVisible();
  await chooser.click();
  const option = page.testSubj.locator(`inspectorRequestChooser${name}`);
  // Wait briefly for the combo-box dropdown to render before probing the option.
  const found = await option
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  await page.keyboard.press('Escape');
  return found;
};
