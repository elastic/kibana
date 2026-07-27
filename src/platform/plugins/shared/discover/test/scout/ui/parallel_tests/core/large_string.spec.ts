/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures';

const TEST_LARGE_STRING_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/testlargestring.json';
const TEST_LARGE_STRING_DATA_VIEW = 'testlargestring';

const HAMLET_COPYRIGHT_TEXT =
  'Project Gutenberg EBook of Hamlet, by William Shakespeare' +
  ' This eBook is for the use of anyone anywhere in the United States' +
  ' and most other parts of the world at no cost and with almost no restrictions whatsoever.' +
  ' You may copy it, give it away or re-use it under the terms of the' +
  ' Project Gutenberg License included with this eBook or online at www.gutenberg.org.' +
  ' If you are not located in the United States,' +
  ' you’ll have to check the laws of the country where you are' +
  ' located before using this ebook.';

spaceTest.describe('Discover large strings', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(TEST_LARGE_STRING_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(TEST_LARGE_STRING_DATA_VIEW);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await pageObjects.dataGrid.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('renders large string field data', async ({ pageObjects }) => {
    await expect(async () => {
      await expect(pageObjects.discover.getDocTableIndex(1)).resolves.toContain(
        HAMLET_COPYRIGHT_TEXT
      );
    }).toPass();
  });

  spaceTest(
    'searches and highlights a term inside large string field data',
    async ({ pageObjects }) => {
      await pageObjects.queryBar.setQuery('Newsletter');
      await pageObjects.discover.submitQuery();
      await pageObjects.discover.waitUntilTabIsLoaded();

      expect(await pageObjects.discover.getHitCountInt()).toBe(1);
      await expect(pageObjects.discover.getSearchTermHighlights()).toHaveCount(1);
    }
  );
});
