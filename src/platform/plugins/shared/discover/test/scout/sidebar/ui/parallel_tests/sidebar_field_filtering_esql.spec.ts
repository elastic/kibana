/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe(
  'Discover sidebar field filtering in ES|QL',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('shows type filters and filters by type in ES|QL', async ({ page, pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 10000');

      await unifiedFieldList.openFieldTypeFilter();
      await expect(page.locator('[data-test-subj^="typeFilter-"]')).toHaveCount(6);
      await unifiedFieldList.closeFieldTypeFilter();

      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await expect(unifiedFieldList.getSidebarSectionCountLocator('available')).toHaveText(
        String(testData.LOGSTASH_ESQL_AVAILABLE_FIELD_COUNT)
      );
      await expect(unifiedFieldList.getSidebarSectionCountLocator('empty')).toHaveText(
        String(testData.LOGSTASH_ESQL_EMPTY_FIELD_COUNT)
      );

      await unifiedFieldList.openFieldTypeFilter();
      await unifiedFieldList.selectFieldTypeFilter('number');
      await unifiedFieldList.closeFieldTypeFilter();

      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await expect(unifiedFieldList.getSidebarSectionCountLocator('available')).toHaveText('5');
      await expect(unifiedFieldList.getSidebarSectionCountLocator('empty')).toHaveText('2');
    });

    spaceTest('shows empty fields for a KEEP query', async ({ pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await discover.writeAndSubmitEsqlQuery(
        'from logstash-* | limit 10 | keep machine.ram_range, bytes'
      );

      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await expect(unifiedFieldList.getSidebarSectionCountLocator('selected')).toHaveText('2');
      await expect(unifiedFieldList.getSidebarSectionCountLocator('available')).toHaveText('1');
      await expect(unifiedFieldList.getSidebarSectionCountLocator('empty')).toHaveText('1');
    });
  }
);
