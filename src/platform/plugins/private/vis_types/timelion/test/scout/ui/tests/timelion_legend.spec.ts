/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Timelion visualization - Legend', { tag: tags.ESS_ONLY }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH_FUNCTIONAL);
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LONG_WINDOW_LOGSTASH);
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.VISUALIZE);
    await uiSettings.set({
      defaultIndex: testData.UI_SETTINGS.DEFAULT_INDEX,
      'format:bytes:defaultPattern': testData.UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN,
      'histogram:maxBars': testData.UI_SETTINGS.HISTOGRAM_MAX_BARS,
      'timepicker:timeDefaults': `{ "from": "${testData.DEFAULT_START_TIME_UTC}", "to": "${testData.DEFAULT_END_TIME_UTC}"}`,
    });
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset(
      'defaultIndex',
      'format:bytes:defaultPattern',
      'histogram:maxBars',
      'timepicker:timeDefaults'
    );
    await kbnClient.savedObjects.cleanStandardList();
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.timelion.goto();
  });

  test('should correctly display the legend items names and position', async ({
    page,
    pageObjects,
  }) => {
    const { timelion } = pageObjects;
    await timelion.initVisualization('.es(*).label("first series"), .es(*).label("second series")');

    const legendNames = await timelion.getLegendEntries();
    const legendClasses = await timelion.getLegendClasses();

    expect(legendNames).toEqual(['first series', 'second series']);
    expect(legendClasses).toContain('echLegend--top');
    expect(legendClasses).toContain('echLegend--left');
  });

  test('should correctly display the legend position', async ({ pageObjects }) => {
    const { timelion } = pageObjects;
    await timelion.initVisualization('.es(*).legend(position=se)');

    const legendClasses = await timelion.getLegendClasses();

    expect(legendClasses).toContain('echLegend--bottom');
    expect(legendClasses).toContain('echLegend--right');
  });

  test('should not display the legend', async ({ pageObjects }) => {
    const { timelion } = pageObjects;
    await timelion.initVisualization(
      '.es(*), .es(*).label("second series").legend(position=false)'
    );

    const isLegendVisible = await timelion.isLegendVisible();
    expect(isLegendVisible).toBe(false);
  });
});
