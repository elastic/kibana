/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover data-grid newline rendering: the Document (`_source`) summary
 * collapses embedded newlines, while a text `message` column preserves them
 * (`pre-wrap`) under Custom/Auto row heights and collapses them (`nowrap`) when
 * the Custom row height is a single line.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '@kbn/scout';
import { testData } from '../../fixtures/common';

// This index must stay readable by the serverless Security viewer role while
// avoiding Observability logs-profile renderers (`logs-*`, `filebeat-*`,
// `logstash-*`). That keeps the test on the standard Summary renderer.
const NEWLINE_INDEX = 'metrics-endpoint.metadata_current_newline';
const VALUE_WITH_NEW_LINES = "Newline!\nHere's a newline.\nHere's a newline again.";
const VALUE_WITHOUT_NEW_LINES = VALUE_WITH_NEW_LINES.replaceAll('\n', ' ');

const getGridCell = (page: ScoutPage, rowIndex: number, columnName: string) =>
  page.locator(
    `[data-grid-visible-row-index="${rowIndex}"] [data-test-subj="dataGridRowCell"][data-gridcell-column-id="${columnName}"]`
  );

const whiteSpaceOf = (locator: Locator) =>
  locator.evaluate((el) => window.getComputedStyle(el).whiteSpace);

spaceTest.describe('Discover data grid new line support', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace, apiServices, esClient }) => {
    await esClient.indices.delete({ index: NEWLINE_INDEX, ignore_unavailable: true });
    await esClient.index({
      index: NEWLINE_INDEX,
      document: {
        message: VALUE_WITH_NEW_LINES,
      },
      refresh: true,
    });

    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);

    // Persisted data view (no time field) over the suite-local newline fixture.
    // Mirrors the FTR ad-hoc data view, but set up via the API so it doesn't
    // depend on the data-view-creation UI.
    await apiServices.dataViews.create({
      title: NEWLINE_INDEX,
      name: NEWLINE_INDEX,
      spaceId: scoutSpace.id,
    });
  });

  spaceTest.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    await page.setViewportSize({ width: 1200, height: 2000 });
    await browserAuth.loginAsViewer();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.selectDataView(NEWLINE_INDEX);
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace, esClient }) => {
    await esClient.indices.delete({ index: NEWLINE_INDEX, ignore_unavailable: true });
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('does not show new lines for the Document column', async ({ page }) => {
    const cell = getGridCell(page, 0, '_source');
    await expect(cell).toBeVisible();

    const description = cell.locator(
      '.unifiedDataTable__descriptionListTitle:has-text("message") + .unifiedDataTable__descriptionListDescription'
    );

    await expect(description).toHaveText(VALUE_WITHOUT_NEW_LINES);
    expect(await whiteSpaceOf(description)).toBe('normal');
  });

  spaceTest(
    'shows new lines for the "message" column except for the single-line row height',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.addFieldFromSidebar('message');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      const messageValue = () =>
        getGridCell(page, 0, 'message').locator('.unifiedDataTable__cellValue');

      // Default (Custom) row height preserves newlines.
      await expect(messageValue()).toBeVisible();
      await expect.poll(async () => messageValue().innerText()).toBe(VALUE_WITH_NEW_LINES);
      expect(await whiteSpaceOf(messageValue())).toBe('pre-wrap');

      // Auto row height still preserves newlines.
      await pageObjects.discover.openGridDisplaySettings();
      expect(await pageObjects.discover.getCurrentRowHeight()).toBe('Custom');
      await pageObjects.discover.setRowHeight('Auto');
      await pageObjects.discover.openGridDisplaySettings();

      await expect.poll(async () => messageValue().innerText()).toBe(VALUE_WITH_NEW_LINES);
      expect(await whiteSpaceOf(messageValue())).toBe('pre-wrap');

      // Single-line (Custom = 1 line) row height collapses newlines.
      await pageObjects.discover.openGridDisplaySettings();
      expect(await pageObjects.discover.getCurrentRowHeight()).toBe('Auto');
      await pageObjects.discover.setRowHeight('Custom');
      await pageObjects.discover.setCustomRowHeight(1);
      await pageObjects.discover.openGridDisplaySettings();

      await expect.poll(async () => messageValue().innerText()).toBe(VALUE_WITHOUT_NEW_LINES);
      expect(await whiteSpaceOf(messageValue())).toBe('nowrap');
    }
  );
});
