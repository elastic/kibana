/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover histogram interval-scaling: the chart should render at a range
 * of intervals (Month → Second) and surface a warning icon only when the
 * requested interval is finer than the bucketing resolution permits.
 * Migrated from 4 `it`s of `_discover_histogram.ts` collapsed into one
 * journey (they share the long_window_logstash setup and only differ in
 * the (from, to, interval) tuple).
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const { LONG_WINDOW_LOGSTASH_KBN_ARCHIVE, LONG_WINDOW_LOGSTASH_DATA_VIEW } = testData;

interface IntervalCase {
  label: string;
  from: string;
  to: string;
  interval: 'Month' | 'Week' | 'Day' | 'Second';
  expectWarningIcon: boolean;
}

const CASES: IntervalCase[] = [
  {
    label: 'monthly data over months',
    from: '2017-11-01T00:00:00.000Z',
    to: '2018-03-21T00:00:00.000Z',
    interval: 'Month',
    expectWarningIcon: false,
  },
  {
    label: 'weekly data spanning DST changes',
    from: '2018-03-01T00:00:00.000Z',
    to: '2018-05-01T00:00:00.000Z',
    interval: 'Week',
    expectWarningIcon: false,
  },
  {
    label: 'years scaled to 30-day intervals',
    from: '2010-01-01T00:00:00.000Z',
    to: '2019-03-21T00:00:00.000Z',
    interval: 'Day',
    expectWarningIcon: false,
  },
  {
    label: 'years scaled to seconds shows the warning icon',
    from: '2010-01-01T00:00:00.000Z',
    to: '2019-03-21T00:00:00.000Z',
    interval: 'Second',
    expectWarningIcon: true,
  },
];

spaceTest.describe('Discover - histogram interval scaling', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(LONG_WINDOW_LOGSTASH_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(LONG_WINDOW_LOGSTASH_DATA_VIEW);
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'Europe/Berlin' });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults', 'dateFormat:tz');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('renders the chart at each tested interval', async ({ scoutSpace, pageObjects }) => {
    for (const c of CASES) {
      await spaceTest.step(c.label, async () => {
        await scoutSpace.uiSettings.setDefaultTime({ from: c.from, to: c.to });
        await pageObjects.discover.goto();
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.setChartInterval(c.interval);
        await pageObjects.discover.waitUntilSearchingHasFinished();

        expect(await pageObjects.discover.chartCanvasExists()).toBe(true);
        expect(await pageObjects.discover.getChartIntervalWarningIcon()).toBe(c.expectWarningIcon);
      });
    }
  });
});
