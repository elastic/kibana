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
import { testData } from '../../fixtures/common';

spaceTest.describe('Discover source filters', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace, apiServices }) => {
    await discoverScoutSpace.setupDiscoverDefaults();

    const dataViewId = await apiServices.dataViews.getIdByTitle(
      testData.DEFAULT_DATA_VIEW,
      discoverScoutSpace.id
    );

    await apiServices.dataViews.update(dataViewId, {
      sourceFilters: ['referer', 'relatedContent*'].map((value) => ({ value })),
      spaceId: discoverScoutSpace.id,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('hides source-filtered fields from the field list', async ({ pageObjects }) => {
    const fieldNames = await pageObjects.unifiedFieldList.getAllFieldNames();

    expect(fieldNames).toContain('extension');
    expect(fieldNames).not.toContain('referer');
    expect(fieldNames.every((fieldName) => !fieldName.startsWith('relatedContent'))).toBe(true);
  });
});
