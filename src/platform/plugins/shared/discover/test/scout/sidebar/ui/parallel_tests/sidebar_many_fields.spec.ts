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
    // Security serverless editor/viewer cannot read `indices-stats`.
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('loads a data view with thousands of fields', async ({ pageObjects }) => {
    const { discover, unifiedFieldList } = pageObjects;

    await expect(unifiedFieldList.getSidebarSectionCountLocator('available')).toHaveText(
      String(testData.LOGSTASH_AVAILABLE_FIELD_COUNT)
    );

    // Avoid selectDataView's default field-list wait: `countLoading` hidden races when the
    // spinner has not mounted yet. The available-count assertion is the readiness signal.
    await discover.selectDataView('indices-stats*', { waitForFieldList: false });
    // Existence fetch for ~6.8k fields exceeds Scout's 10s expect timeout on CI (FTR used
    // retry.waitFor with a much larger budget for the same condition).
    await expect(unifiedFieldList.getSidebarSectionCountLocator('available')).toHaveText('6873', {
      timeout: 30_000,
    });
    await expect(unifiedFieldList.getSidebarSectionCountLocator('meta')).toHaveText('4');

    await discover.selectDataView(testData.DEFAULT_DATA_VIEW, { waitForFieldList: false });
    await expect(unifiedFieldList.getSidebarSectionCountLocator('available')).toHaveText(
      String(testData.LOGSTASH_AVAILABLE_FIELD_COUNT)
    );
  });
});
