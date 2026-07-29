/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL syntax errors surface a callout with a helpful, non-generic message.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { spaceTest, testData } from '../../fixtures';

const BROKEN_QUERIES = [
  { query: 'from logstash-* | limit 10*', expectedMarkerCount: 1 },
  { query: 'from logstash-* | limit A', expectedMarkerCount: 1 },
  { query: 'from logstash-* | where a*', expectedMarkerCount: 1 },
  { query: 'limit 10', expectedMarkerCount: 1 },
];

spaceTest.describe('Discover ES|QL view - errors', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows a helpful error callout for syntax errors', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    for (const { query, expectedMarkerCount } of BROKEN_QUERIES) {
      await spaceTest.step(`query: ${query}`, async () => {
        await discover.codeEditor.setCodeEditorValue(query);
        await discover.submitQuery();

        const callout = page.testSubj.locator('discoverErrorCalloutTitle');
        await expect(callout).toBeVisible();

        const message = await page.testSubj.innerText('discoverErrorCalloutMessage');
        expect(message).toContain(
          "[esql] > Couldn't parse Elasticsearch ES|QL query. Check your query and try again."
        );
        expect(message).not.toContain('undefined');

        // `.cdr.squiggly-error` is the Monaco decoration class — no test-subj exists for it.
        await expect(
          page.testSubj.locator('kibanaCodeEditor').locator('.cdr.squiggly-error')
        ).toHaveCount(expectedMarkerCount);
      });
    }
  });
});
