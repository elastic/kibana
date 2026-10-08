/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags, testData } from '../fixtures';

spaceTest.describe('Discover sidebar field search', { tag: tags.deploymentAgnostic }, () => {
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

  spaceTest('narrows available fields when searching by name', async ({ pageObjects }) => {
    const { unifiedFieldList } = pageObjects;

    await unifiedFieldList.expectAvailableFieldCount(testData.LOGSTASH_AVAILABLE_FIELD_COUNT);

    await unifiedFieldList.searchField('clientip');
    await unifiedFieldList.expectAvailableFieldCount(1);
    await expect(unifiedFieldList.getAvailableField('clientip')).toBeVisible();

    await unifiedFieldList.clearFieldSearch();
    await unifiedFieldList.expectAvailableFieldCount(testData.LOGSTASH_AVAILABLE_FIELD_COUNT);
  });
});
