/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover request counts (data-view mode): Discover should issue precisely
 * 2 search requests (documents + chart) on most interactions, 1 for chart-
 * only updates (breakdown / interval), and 0 for chart-visibility toggles.
 *
 * Migrated from the `data view mode` describe inside
 * `src/platform/test/functional/apps/discover/group3/_request_counts.ts`.
 *
 * The original FTR file also covers ES|QL mode via a shared helper. ES|QL
 * mode is not migrated here because Scout's ESQL editor + page-load count
 * behave differently under `discover:searchOnPageLoad=false`; it deserves
 * its own focused spec rather than a re-share of the FTR helper.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const { LONG_WINDOW_LOGSTASH_KBN_ARCHIVE, LONG_WINDOW_LOGSTASH_DATA_VIEW } = testData;
const SAVED_SEARCH_NAME = 'data view test';

spaceTest.describe('Discover - request counts (data view mode)', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(LONG_WINDOW_LOGSTASH_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'issues 2 requests on refresh, query change, time-range change, filter, sort, data-view switch',
    async ({ pageObjects }) => {
      await spaceTest.step('refresh', async () => {
        await pageObjects.discover.expectSearchRequestCount('ese', 2, async () => {
          await pageObjects.queryBar.clickQuerySubmitButton();
        });
      });

      await spaceTest.step('query change', async () => {
        await pageObjects.discover.expectSearchRequestCount('ese', 2, async () => {
          await pageObjects.queryBar.setQuery('bytes > 1000');
          await pageObjects.queryBar.submitQuery();
        });
      });

      await spaceTest.step('time-range change', async () => {
        await pageObjects.discover.expectSearchRequestCount('ese', 2, async () => {
          await pageObjects.datePicker.setAbsoluteRange({
            from: 'Sep 21, 2015 @ 06:31:44.000',
            to: 'Sep 23, 2015 @ 00:00:00.000',
          });
        });
      });

      await spaceTest.step('add filter', async () => {
        await pageObjects.discover.expectSearchRequestCount('ese', 2, async () => {
          await pageObjects.filterBar.addFilter({
            field: 'extension',
            operator: 'is',
            value: 'jpg',
          });
        });
      });

      await spaceTest.step('sort by field', async () => {
        await pageObjects.discover.expectSearchRequestCount('ese', 2, async () => {
          await pageObjects.discover.clickFieldSort('@timestamp', 'Sort Old-New');
        });
      });

      await spaceTest.step('switch data view', async () => {
        await pageObjects.discover.expectSearchRequestCount('ese', 2, async () => {
          await pageObjects.discover.selectIndexPattern(LONG_WINDOW_LOGSTASH_DATA_VIEW);
        });
      });
    }
  );

  spaceTest(
    'issues 0 requests for chart-toggle, 1 for breakdown / interval changes',
    async ({ pageObjects }) => {
      await spaceTest.step('chart-visibility toggle: 0 requests', async () => {
        await pageObjects.discover.expectSearchRequestCount('ese', 0, async () => {
          await pageObjects.discover.toggleChartVisibility();
          await pageObjects.discover.toggleChartVisibility();
        });
      });

      await spaceTest.step('breakdown without other-bucket: 1 request', async () => {
        await pageObjects.discover.expectSearchRequestCount('ese', 1, async () => {
          await pageObjects.discover.chooseBreakdownField('type');
        });
      });

      await spaceTest.step('chart interval change: 1 request', async () => {
        await pageObjects.discover.expectSearchRequestCount('ese', 1, async () => {
          await pageObjects.discover.setChartInterval('Day');
        });
      });
    }
  );

  spaceTest('saved search lifecycle issues expected requests', async ({ pageObjects }) => {
    // Prime: set a query and time range that will be saved.
    await pageObjects.queryBar.setQuery('bytes > 1000');
    await pageObjects.queryBar.submitQuery();
    await pageObjects.datePicker.setAbsoluteRange({
      from: 'Sep 21, 2015 @ 06:31:44.000',
      to: 'Sep 23, 2015 @ 00:00:00.000',
    });
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableLoadingComplete();

    await spaceTest.step('save: 0 requests', async () => {
      await pageObjects.discover.expectSearchRequestCount('ese', 0, async () => {
        await pageObjects.discover.saveSearch(SAVED_SEARCH_NAME);
      });
    });

    // Cause unsaved changes so revert has something to do.
    await pageObjects.queryBar.setQuery('bytes < 2000');
    await pageObjects.queryBar.submitQuery();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableLoadingComplete();

    await spaceTest.step('revert unsaved changes: 2 requests', async () => {
      await pageObjects.discover.expectSearchRequestCount('ese', 2, async () => {
        await pageObjects.discover.revertUnsavedChanges();
      });
    });

    await spaceTest.step('clear saved search via New: 2 requests', async () => {
      await pageObjects.discover.expectSearchRequestCount('ese', 2, async () => {
        await pageObjects.discover.clickNewSearchButton();
        await pageObjects.discover.waitForDocTableLoadingComplete();
      });
    });

    await spaceTest.step('load saved search: 2 requests', async () => {
      await pageObjects.discover.expectSearchRequestCount('ese', 2, async () => {
        await pageObjects.discover.loadSavedSearch(SAVED_SEARCH_NAME);
      });
    });

    // Sanity: the loaded saved search rendered.
    expect(await pageObjects.discover.isChartVisible()).toBe(true);
  });
});
