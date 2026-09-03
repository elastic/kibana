/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Session basics: time range, save/load/rename, hits, chart, no-results,
 * nested KQL, and invalid URL time.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../common/ui/fixtures';

const EMPTY_RANGE = {
  from: 'Jun 11, 1999 @ 09:22:11.000',
  to: 'Jun 12, 1999 @ 11:21:04.000',
};

const EXPECTED_CHART_TIMESPAN = `${testData.DEFAULT_TIME_RANGE_DISPLAY.from} - ${testData.DEFAULT_TIME_RANGE_DISPLAY.to} (interval: Auto - 3 hours)`;

spaceTest.describe('query and session', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'shows the default time range, hits, and session name',
    async ({ pageObjects, scoutSpace }) => {
      const { datePicker, discover } = pageObjects;
      const sessionName = `Query 1 ${scoutSpace.id}`;
      const renamedSessionName = `Modified Query 1 ${scoutSpace.id}`;

      await spaceTest.step('default time range and newest document', async () => {
        expect(await datePicker.getTimeConfig()).toStrictEqual({
          start: testData.DEFAULT_TIME_RANGE.from,
          end: testData.DEFAULT_TIME_RANGE.to,
        });
        expect(await discover.getDocTableIndex(1)).toContain('Sep 22, 2015 @ 23:50:13.253');
      });

      await spaceTest.step('save, load, and rename a session', async () => {
        await discover.saveSearch(sessionName);
        await discover.waitUntilTabIsLoaded();
        await expect(discover.getCurrentQueryNameLocator()).toHaveText(sessionName);

        await discover.loadSavedSearch(sessionName);
        await expect(discover.getCurrentQueryNameLocator()).toHaveText(sessionName);

        await discover.saveSearch(renamedSessionName);
        await discover.waitUntilTabIsLoaded();
        await expect(discover.getCurrentQueryNameLocator()).toHaveText(renamedSessionName);
      });

      await spaceTest.step('hit count and chart timespan', async () => {
        await expect(discover.getHitCountLocator()).toHaveText('14,004');
        expect(await discover.getChartTimespan()).toBe(EXPECTED_CHART_TIMESPAN);
      });
    }
  );

  spaceTest('updates the time range when a histogram bar is clicked', async ({ pageObjects }) => {
    const { datePicker, discover } = pageObjects;

    await datePicker.setAbsoluteRange(testData.DEFAULT_TIME_RANGE_DISPLAY);
    await discover.waitUntilTabIsLoaded();
    await discover.clickHistogramBar();
    await discover.waitUntilTabIsLoaded();

    expect(await datePicker.getTimeConfig()).toStrictEqual({
      start: '2015-09-21T09:00:00.000Z',
      end: '2015-09-21T12:00:00.000Z',
    });
    expect(await discover.getDocTableIndex(1)).toContain('Sep 21, 2015 @ 11:59:22.316');
  });

  spaceTest(
    'shows Auto chart interval and results for the default range',
    async ({ page, pageObjects }) => {
      const { datePicker, discover } = pageObjects;

      await datePicker.setAbsoluteRange(testData.DEFAULT_TIME_RANGE_DISPLAY);
      await discover.waitUntilTabIsLoaded();
      await page.testSubj.click('discoverQueryHits');
      expect(await discover.getChartInterval()).toBe('auto');
      await expect(page.testSubj.locator('discoverNoResults')).toBeHidden();
    }
  );

  spaceTest(
    'reverts an unsaved query back to the persisted hit count',
    async ({ pageObjects, scoutSpace }) => {
      const { discover, queryBar } = pageObjects;
      const sessionName = `persisted query ${scoutSpace.id}`;

      await discover.saveSearch(sessionName);
      await discover.waitUntilTabIsLoaded();

      await discover.writeAndSubmitKqlQuery('test');
      await expect(discover.getHitCountLocator()).toHaveText('22');

      await queryBar.clearQuery();
      await discover.waitUntilTabIsLoaded();
      await discover.revertUnsavedChanges();
      expect(await queryBar.getQuery()).toBe('');
      await expect(discover.getHitCountLocator()).toHaveText('14,004');
    }
  );

  spaceTest(
    'shows no results for an empty range and expands to matches',
    async ({ page, pageObjects }) => {
      const { datePicker, discover } = pageObjects;

      await datePicker.setAbsoluteRange(EMPTY_RANGE);
      await discover.waitUntilSearchingHasFinished();

      await spaceTest.step('empty range shows the no-results prompt', async () => {
        await expect(page.testSubj.locator('discoverNoResults')).toBeVisible();
        await expect(page.testSubj.locator('discoverNoResultsTimefilter')).toBeVisible();
      });

      await spaceTest.step('suggested range restores matches', async () => {
        await discover.expandTimeRangeAsSuggestedInNoResultsMessage();
        await expect(page.testSubj.locator('discoverNoResults')).toBeHidden();
        expect(await discover.getHitCountInt()).toBeGreaterThan(0);
      });
    }
  );

  spaceTest('supports querying on nested fields', async ({ pageObjects }) => {
    const { discover } = pageObjects;

    await discover.writeAndSubmitKqlQuery('nestedField:{ child: nestedValue }');
    await expect(discover.getHitCountLocator()).toHaveText('1');
  });

  spaceTest(
    'falls back to a relative range when the URL time is invalid',
    async ({ page, pageObjects }) => {
      const { datePicker, discover } = pageObjects;

      await page.gotoApp('discover', { hash: '/?_g=(time:(from:now-15m,to:null))' });
      // Reload the page to ensure the time range is applied. It can be removed after resolving #287837
      await page.reload();
      await discover.waitUntilTabIsLoaded();

      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: testData.DEFAULT_TIME_RANGE.from,
        end: testData.DEFAULT_TIME_RANGE.to,
      });
    }
  );
});
