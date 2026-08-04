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

spaceTest.describe('Discover sidebar many fields', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    await discoverScoutSpace.savedObjects.load(testData.MANY_FIELDS_KBN_ARCHIVE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('loads a data view with thousands of fields', async ({ pageObjects }) => {
    const { discover, unifiedFieldList } = pageObjects;

    const baselineCount = await unifiedFieldList.getAvailableFieldCount();
    expect(baselineCount).toBeGreaterThan(0);

    await discover.selectDataView('indices-stats*');
    await discover.waitUntilSearchingHasFinished();

    // Behavioral: the wide index exposes far more fields than logstash defaults.
    expect(await unifiedFieldList.getAvailableFieldCount()).toBeGreaterThan(1_000);

    await discover.selectDataView(testData.DEFAULT_DATA_VIEW);
    await discover.waitUntilSearchingHasFinished();
    await unifiedFieldList.expectAvailableFieldCount(baselineCount);
  });
});
