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

const EXPECTED_TEXT =
  'Project Gutenberg EBook of Hamlet, by William Shakespeare' +
  ' This eBook is for the use of anyone anywhere in the United States' +
  ' and most other parts of the world at no cost and with almost no restrictions whatsoever.' +
  ' You may copy it, give it away or re-use it under the terms of the' +
  ' Project Gutenberg License included with this eBook or online at www.gutenberg.org.' +
  ' If you are not located in the United States,' +
  ' you’ll have to check the laws of the country where you are' +
  ' located before using this ebook.';

spaceTest.describe('Discover large strings', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(
      'src/platform/test/functional/fixtures/kbn_archiver/testlargestring.json'
    );
    await scoutSpace.uiSettings.setDefaultIndex('testlargestring');
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('renders the large Hamlet string in the document table', async ({ page }) => {
    await expect(page.locator('[data-grid-row-index="0"]')).toContainText(EXPECTED_TEXT);
  });

  spaceTest('returns one hit for the Newsletter query', async ({ page, pageObjects }) => {
    await pageObjects.discover.writeAndSubmitKqlQuery('Newsletter');

    await expect(page.testSubj.locator('discoverQueryHits')).toHaveText('1');
  });

  spaceTest('highlights the Newsletter match in the field data', async ({ pageObjects }) => {
    await pageObjects.discover.writeAndSubmitKqlQuery('Newsletter');

    await expect(pageObjects.discover.getMarks()).toHaveCount(1);
  });
});
