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
import { spaceTest, testData } from '../../../common/ui/fixtures';

spaceTest.describe('histogram', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults({ loadLongWindowDataView: true });
    await discoverScoutSpace.uiSettings.setDefaultIndex(testData.LONG_WINDOW_LOGSTASH_DATA_VIEW);
    await discoverScoutSpace.uiSettings.set({ 'dateFormat:tz': 'Europe/Berlin' });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects, config }) => {
    // Security serverless editor can read `logstash-*` but not `long-window-logstash-*`.
    // FTR used admin on serverless for the same reason.
    if (config.serverless && config.projectType === 'security') {
      await browserAuth.loginAsAdmin();
    } else {
      await browserAuth.loginAsPrivilegedUser();
    }
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.uiSettings.unset('dateFormat:tz', 'timepicker:timeDefaults');
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('modifies the time range when the histogram is brushed', async ({ pageObjects }) => {
    const { datePicker, discover } = pageObjects;

    await discover.waitForHistogramRendered();
    const prevRowData = await discover.getDocTableIndex(1);
    const prevTime = await datePicker.getTimeConfig();

    await discover.brushHistogram();
    await discover.waitUntilSearchingHasFinished();
    await discover.waitForHistogramRendered();

    const nextTime = await datePicker.getTimeConfig();
    expect(`${nextTime.start}|${nextTime.end}`).not.toBe(`${prevTime.start}|${prevTime.end}`);
    expect(await discover.getDocTableIndex(1)).not.toBe(prevRowData);
  });

  spaceTest('updates after switching data views and brushing', async ({ pageObjects }) => {
    const { discover } = pageObjects;

    await discover.selectDataView(testData.DEFAULT_DATA_VIEW);
    await discover.waitUntilSearchingHasFinished();
    await discover.selectDataView(testData.LONG_WINDOW_LOGSTASH_DATA_VIEW);
    await discover.waitUntilSearchingHasFinished();
    await discover.brushHistogram();
    await discover.waitUntilSearchingHasFinished();
    await expect(discover.getHitCountLocator()).toHaveText('7');
  });

  spaceTest(
    'updates the histogram time range when the query is resubmitted',
    async ({ discoverScoutSpace, pageObjects }) => {
      const { discover } = pageObjects;

      await discoverScoutSpace.uiSettings.set({
        'timepicker:timeDefaults': '{  "from": "2015-09-18T19:37:13.000Z",  "to": "now"}',
      });
      await discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();

      const initialTimeString = await discover.getChartTimespan();
      await discover.submitQuery();
      await discover.waitUntilSearchingHasFinished();
      await expect(discover.getHistogramChart()).not.toHaveAttribute(
        'data-time-range',
        initialTimeString
      );
    }
  );

  spaceTest('visualizes long-window data at different intervals', async ({ pageObjects }) => {
    const { datePicker, discover } = pageObjects;

    const prepare = async (from: string, to: string, interval: string) => {
      await datePicker.setAbsoluteRange({ from, to });
      await discover.waitUntilSearchingHasFinished();
      await discover.setChartInterval(interval);
      await discover.waitUntilTabIsLoaded();
    };

    await spaceTest.step('monthly data', async () => {
      await prepare('Nov 1, 2017 @ 00:00:00.000', 'Mar 21, 2018 @ 00:00:00.000', 'Month');
      await expect(discover.getHistogramChart()).toBeVisible();
    });

    await spaceTest.step('weekly data across DST', async () => {
      await prepare('Mar 1, 2018 @ 00:00:00.000', 'May 1, 2018 @ 00:00:00.000', 'Week');
      await expect(discover.getHistogramChart()).toBeVisible();
    });

    await spaceTest.step('multi-year range scaled to days has no warning', async () => {
      await prepare('Jan 1, 2010 @ 00:00:00.000', 'Mar 21, 2019 @ 00:00:00.000', 'Day');
      await expect(discover.getHistogramChart()).toBeVisible();
      await expect(discover.getChartIntervalWarningIcon()).toBeHidden();
    });

    await spaceTest.step('multi-year range scaled to seconds shows a warning', async () => {
      await prepare('Jan 1, 2010 @ 00:00:00.000', 'Mar 21, 2019 @ 00:00:00.000', 'Second');
      await expect(discover.getHistogramChart()).toBeVisible();
      await expect(discover.getChartIntervalWarningIcon()).toBeVisible();
    });
  });

  spaceTest('persists histogram hide/show in the URL', async ({ page, pageObjects }) => {
    const { datePicker, discover } = pageObjects;
    const from = 'Jan 1, 2010 @ 00:00:00.000';
    const to = 'Mar 21, 2019 @ 00:00:00.000';

    await discover.showChart();
    await datePicker.setAbsoluteRange({ from, to });
    await discover.waitUntilSearchingHasFinished();
    await expect(discover.getHistogramChart()).toBeVisible();
    await discover.hideChart();
    await expect(discover.getHistogramChart()).toBeHidden();
    await page.reload();
    await discover.waitUntilTabIsLoaded();
    await expect(discover.getHistogramChart()).toBeHidden();
    await discover.showChart();
    await expect(discover.getHistogramChart()).toBeVisible();
  });

  spaceTest(
    'recovers from a broken query when the query bar is cleared',
    async ({ pageObjects }) => {
      const { discover, queryBar } = pageObjects;

      await queryBar.setQuery('this is > not valid');
      await discover.submitQuery();
      await expect(discover.getErrorCalloutTitle()).toBeVisible();

      await queryBar.clearQuery();
      await discover.submitQuery();
      await discover.waitUntilSearchingHasFinished();
      await expect(discover.getHistogramChart()).toBeVisible();
    }
  );
});
