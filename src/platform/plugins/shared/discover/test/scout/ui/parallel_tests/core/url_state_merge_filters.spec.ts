/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover URL state: merging custom global filters from a URL with the
 * filters embedded in a saved search. Migrated from the "should merge
 * custom global filters with saved search filters" test in
 * `src/platform/test/functional/apps/discover/group5/_url_state.ts`.
 *
 * Flow:
 *   1. Open Discover with a non-default `timepicker:timeDefaults` so the
 *      saved search captures a known time range.
 *   2. Add an `is between` numeric filter, save the search, capture the
 *      saved-search id from the URL.
 *   3. Open the saved search via its `/view/<id>` URL → only the embedded
 *      filter applies (737 hits).
 *   4. Open the same `/view/<id>` URL with an extra `_g` global filter →
 *      both filters apply (137 hits) and Discover shows the
 *      "unsaved changes" indicator because the URL adds state on top of
 *      the persisted saved search.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const SAVED_SEARCH = 'testFilters';
const HITS_ONE_FILTER = '737';
const HITS_TWO_FILTERS = '137';

const EXPECTED_FIRST_ROWS_ONE_FILTER = [
  'Sep 22, 2015 @ 20:44:05.521jpg1,808',
  'Sep 22, 2015 @ 20:41:53.463png1,969',
  'Sep 22, 2015 @ 20:40:22.952jpg1,576',
  'Sep 22, 2015 @ 20:11:39.532png1,708',
  'Sep 22, 2015 @ 19:45:13.813php1,406',
  'Sep 22, 2015 @ 19:40:17.903jpg1,557',
];

const EXPECTED_FIRST_ROWS_TWO_FILTERS = [
  'Sep 22, 2015 @ 20:41:53.463png1,969',
  'Sep 22, 2015 @ 20:11:39.532png1,708',
  'Sep 22, 2015 @ 18:50:22.335css1,841',
  'Sep 22, 2015 @ 18:40:32.329css1,945',
  'Sep 22, 2015 @ 18:13:35.361css1,752',
  'Sep 22, 2015 @ 17:22:12.782css1,583',
];

// `_g` rison-encoded global-state with an `extension.raw IN (png, css)`
// phrases filter, pinned via `store:globalState`.
const G_PHRASES_PNG_CSS =
  "_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,field:extension.raw," +
  'index:%27logstash-*%27,key:extension.raw,negate:!f,params:!(png,css),type:phrases,' +
  'value:!(png,css)),query:(bool:(minimum_should_match:1,should:!((match_phrase:(extension.raw:png)),' +
  '(match_phrase:(extension.raw:css))))))),query:(language:kuery,query:%27%27),' +
  'refreshInterval:(pause:!t,value:60000),' +
  'time:(from:%272015-09-19T06:31:44.000Z%27,to:%272015-09-23T18:31:44.000Z%27))';

spaceTest.describe('Discover - URL state merge filters', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    // Specific time-defaults from FTR — embedded into the saved search.
    await scoutSpace.uiSettings.setDefaultTime({
      from: '2015-09-18T19:37:13.000Z',
      to: '2015-09-23T02:30:09.000Z',
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.setQueryMode('classic');
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'global URL filter is merged with saved search filters and surfaces unsaved-changes',
    async ({ kbnUrl, page, pageObjects, scoutSpace }) => {
      // --- Setup: build the saved search ---
      await pageObjects.discover.goto();
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await pageObjects.filterBar.addFilter({
        field: 'bytes',
        operator: 'is between',
        value: { from: '1000', to: '2000' },
      });
      await pageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
      await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await pageObjects.discover.waitUntilSearchingHasFinished();

      await expect(pageObjects.discover.hitCountLocator()).toHaveText(HITS_ONE_FILTER, {
        timeout: 30_000,
      });

      await pageObjects.discover.saveSearch(SAVED_SEARCH);
      await pageObjects.discover.waitUntilSearchingHasFinished();

      const url = page.url();
      const match = url.match(/view\/([^?]+)(?:\?|$)/);
      const savedSearchId = match?.[1];
      if (!savedSearchId) {
        throw new Error(`Could not extract saved-search id from URL: ${url}`);
      }

      // --- Open via direct /view/<id> URL: only embedded filter applies ---
      await spaceTest.step(
        'opening the saved search by URL applies only the embedded filter',
        async () => {
          await page.goto(
            kbnUrl.app('discover', {
              space: scoutSpace.id,
              pathOptions: { hash: `/view/${savedSearchId}` },
            })
          );
          await pageObjects.discover.waitUntilSearchingHasFinished();

          expect((await pageObjects.dataGrid.getRowsText()).slice(0, 6)).toStrictEqual(
            EXPECTED_FIRST_ROWS_ONE_FILTER
          );
          await expect(pageObjects.discover.hitCountLocator()).toHaveText(HITS_ONE_FILTER, {
            timeout: 30_000,
          });
        }
      );

      // --- Open via /view/<id>?_g=... URL: both filters merge ---
      await spaceTest.step(
        'opening the same URL with a global _g filter merges both and surfaces unsaved-changes',
        async () => {
          const viewPath = `/view/${savedSearchId}`;
          await page.goto(
            `${kbnUrl.app('discover', {
              space: scoutSpace.id,
              pathOptions: { hash: viewPath },
            })}?${G_PHRASES_PNG_CSS}`
          );
          await pageObjects.discover.waitUntilSearchingHasFinished();

          expect((await pageObjects.dataGrid.getRowsText()).slice(0, 6)).toStrictEqual(
            EXPECTED_FIRST_ROWS_TWO_FILTERS
          );
          await expect(pageObjects.discover.hitCountLocator()).toHaveText(HITS_TWO_FILTERS, {
            timeout: 30_000,
          });
          await pageObjects.discover.ensureHasUnsavedChangesIndicator();

          // Reload should preserve the merged state (FTR asserts this too).
          await page.reload();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          expect((await pageObjects.dataGrid.getRowsText()).slice(0, 6)).toStrictEqual(
            EXPECTED_FIRST_ROWS_TWO_FILTERS
          );
          await expect(pageObjects.discover.hitCountLocator()).toHaveText(HITS_TWO_FILTERS, {
            timeout: 30_000,
          });
          await pageObjects.discover.ensureHasUnsavedChangesIndicator();
        }
      );
    }
  );
});
