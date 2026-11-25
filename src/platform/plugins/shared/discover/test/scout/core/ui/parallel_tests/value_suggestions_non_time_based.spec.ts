/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { spaceTest, testData } from '../../../common/ui/fixtures';

spaceTest.describe(
  'Discover app - value suggestions non-time based',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.search,
      ...tags.serverless.observability.complete,
    ],
  },
  // TODO: Update to use an ES archive with an index accessible to 'viewer'
  // for running this test against the Security serverless project.
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.INDEX_PATTERN_WITHOUT_TIMEFIELD_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.NO_TIME_FIELD_DATA_VIEW);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'shows all auto-suggest options for a filter in discover context app',
      async ({ page }) => {
        await page.testSubj.fill('queryInput', 'type.keyword : ');
        await expect(
          page.testSubj.locator('autoCompleteSuggestionText'),
          testData.SUGGESTIONS_COUNT_ASSERTION_MESSAGE
        ).toHaveCount(1);
        const actualSuggestions = await page.testSubj
          .locator('autoCompleteSuggestionText')
          .allTextContents();
        expect(actualSuggestions.join(',')).toContain('"apache"');
      }
    );
  }
);
