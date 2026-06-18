/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const getSpacePrefix = (url: string): string =>
  new URL(url).pathname.match(/^\/s\/[^/]+/)?.[0] ?? '';

spaceTest.describe('Discover shared links in query state', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(
      'src/platform/test/functional/fixtures/kbn_archiver/discover.json'
    );
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ 'state:storeInSessionStorage': false });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(
      'defaultIndex',
      'timepicker:timeDefaults',
      'state:storeInSessionStorage'
    );
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('copies the snapshot URL from the share modal', async ({ page, pageObjects }) => {
    const { share } = pageObjects;

    await share.openShareModal();
    const sharedUrl = await share.getSharedUrl();

    expect(sharedUrl).toMatch(/\/app\/r.+$/);
    expect(sharedUrl.startsWith(new URL(page.url()).origin)).toBe(true);
  });

  spaceTest(
    'loads a snapshot URL with an empty sort param correctly',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;
      const currentUrl = page.url();
      const { origin } = new URL(currentUrl);
      const spacePrefix = getSpacePrefix(currentUrl);
      const snapshotUrl =
        `${origin}${spacePrefix}/app/discover?_t=1453775307251#` +
        `/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time` +
        `:(from:'2015-09-19T06:31:44.000Z',to:'2015-09-23T18:31:44.000Z'))` +
        `&_a=(columns:!(),filters:!(),index:'logstash-*',interval:auto,query:(language:kuery,query:''),sort:!())`;

      await page.goto(snapshotUrl);
      await discover.waitUntilSearchingHasFinished();

      // url fallback default sort should have been pushed to the URL. Playwright's
      // page.url() returns the decoded URL (literal single quotes), unlike the
      // percent-encoded form Selenium's getCurrentUrl() exposed in the legacy FTR test.
      await expect.poll(() => page.url()).toContain("sort:!(!('@timestamp',desc))");

      // document table should contain the right timestamp in the first row
      await discover.waitForDocTableRendered();
      await expect
        .poll(() => discover.getDocTableIndex(1))
        .toContain('Sep 22, 2015 @ 23:50:13.253');
    }
  );
});
