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

const setColumnsInHash = (hash: string, columns: string[]) => {
  const columnsState = `columns:!(${columns.join(',')})`;
  if (hash.includes('columns:!(')) {
    return hash.replace(/columns:!\([^)]*\)/, columnsState);
  }

  if (!hash.includes('_a=(')) {
    throw new Error(`Expected Discover URL hash to contain _a app state: ${hash}`);
  }

  return hash.replace('_a=(', `_a=(${columnsState},`);
};

spaceTest.describe('Discover field data', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await pageObjects.dataGrid.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('shows expected hit counts for KQL field data queries', async ({ pageObjects }) => {
    await pageObjects.discover.writeAndSubmitKqlQuery('php');
    expect(await pageObjects.discover.getHitCountInt()).toBe(445);

    await pageObjects.discover.writeAndSubmitKqlQuery('type:apache');
    expect(await pageObjects.discover.getHitCountInt()).toBe(11156);
  });

  spaceTest('highlights search terms in field data', async ({ pageObjects }) => {
    await pageObjects.discover.writeAndSubmitKqlQuery('php');
    await pageObjects.unifiedFieldList.clickFieldListItemAdd('extension');

    await expect(
      pageObjects.discover.getSearchTermHighlights().filter({ hasText: 'php' })
    ).not.toHaveCount(0);
  });

  spaceTest('shows a KQL syntax error callout', async ({ pageObjects }) => {
    await pageObjects.queryBar.setQuery('xxx(yyy))');
    await pageObjects.discover.submitQuery();

    await expect(pageObjects.discover.getErrorCalloutMessage()).toContainText(
      'Expected ":", "<", "<=", ">", ">=", AND, OR, end of input, whitespace but "(" found.'
    );
  });

  spaceTest(
    'shows top-level object keys and normalizes legacy source-column URLs',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.writeAndSubmitKqlQuery('election');
      const currentUrl = new URL(page.url());
      await page.goto(
        `${currentUrl.origin}${currentUrl.pathname}${setColumnsInHash(currentUrl.hash, [
          'relatedContent',
        ])}`
      );

      await expect(pageObjects.dataGrid.getColumnHeader('relatedContent')).toBeVisible();
      await expect(pageObjects.dataGrid.getCell(0, 'relatedContent')).toContainText(
        'relatedContent.url'
      );
      await expect(pageObjects.discover.getSearchTermHighlights()).not.toHaveCount(0);

      const relatedContentUrl = new URL(page.url());
      const sourceColumnHash = setColumnsInHash(relatedContentUrl.hash, ['_source']).replace(
        'election',
        'club'
      );
      await page.goto(
        `${relatedContentUrl.origin}${relatedContentUrl.pathname}${sourceColumnHash}`
      );
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.dataGrid.waitForDocTableRendered();

      const gridHeader = await pageObjects.discover.getDocHeader();
      expect(gridHeader).toContain('@timestamp');
      expect(gridHeader).toContain('Summary');
      expect(gridHeader).not.toContain('_source');
      await expect(pageObjects.discover.getSearchTermHighlights()).not.toHaveCount(0);
    }
  );

  spaceTest(
    'keeps default columns while adding and removing a selected field',
    async ({ pageObjects }) => {
      expect(await pageObjects.discover.getDocHeader()).toStrictEqual(['@timestamp', 'Summary']);
      expect(await pageObjects.discover.getHitCountInt()).toBe(14004);

      await pageObjects.unifiedFieldList.clickFieldListItemAdd('_score');
      expect(await pageObjects.discover.getDocHeader()).toContain('_score');
      expect(await pageObjects.discover.getDocHeader()).not.toContain('Summary');

      await pageObjects.unifiedFieldList.clickFieldListItemRemove('_score');
      expect(await pageObjects.discover.getDocHeader()).not.toContain('_score');
      expect(await pageObjects.discover.getDocHeader()).toContain('Summary');
    }
  );
});
