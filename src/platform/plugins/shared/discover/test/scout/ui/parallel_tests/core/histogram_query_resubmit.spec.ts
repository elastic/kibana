/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover histogram: re-submitting the query while `to: now` is in the
 * time-defaults should advance the chart timespan. Migrated from the
 * "should update the histogram timerange when the query is resubmitted"
 * test in `_discover_histogram.ts`.
 *
 * The original test polls the chart timespan in a `retry.waitFor` loop,
 * calling `submitQuery` on every iteration — the timespan only changes
 * once enough wall-clock time has elapsed for `now` to round to a
 * different histogram-friendly value, which is usually after the first
 * tick. We follow the same pattern with `expect.poll`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const { LONG_WINDOW_LOGSTASH_KBN_ARCHIVE, LONG_WINDOW_LOGSTASH_DATA_VIEW } = testData;

spaceTest.describe(
  'Discover - histogram query resubmit timespan',
  { tag: tags.stateful.all },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.savedObjects.load(LONG_WINDOW_LOGSTASH_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(LONG_WINDOW_LOGSTASH_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime({
        from: '2015-09-18T19:37:13.000Z',
        to: 'now',
      });
      await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'Europe/Berlin' });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.setQueryMode('classic');
      await pageObjects.discover.goto();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // Explicitly switch to the long-window data view: relying on the
      // `defaultIndex` UI setting alone is racey — Discover can land on
      // an unrelated auto-created data view ("Beats Monitoring") before
      // the setting is read, leaving the histogram unmounted because the
      // selected view has no documents in range.
      await pageObjects.discover.selectIndexPattern(LONG_WINDOW_LOGSTASH_DATA_VIEW);
      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults', 'dateFormat:tz');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('chart timespan advances when query is resubmitted', async ({ pageObjects }) => {
      const before = await pageObjects.discover.getChartTimespan();

      await expect
        .poll(
          async () => {
            await pageObjects.queryBar.submitQuery();
            await pageObjects.discover.waitUntilSearchingHasFinished();
            return pageObjects.discover.getChartTimespan();
          },
          { timeout: 30_000, intervals: [1000, 2000, 2000, 4000] }
        )
        .not.toBe(before);
    });
  }
);
