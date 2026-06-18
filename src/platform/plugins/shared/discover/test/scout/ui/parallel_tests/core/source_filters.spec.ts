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
import { testData } from '../../fixtures/common';

spaceTest.describe('Discover source filters', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.load(
      'src/platform/test/functional/fixtures/kbn_archiver/visualize.json'
    );
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);

    const dataViewId = await apiServices.dataViews.getIdByTitle(
      testData.DEFAULT_DATA_VIEW,
      scoutSpace.id
    );

    await apiServices.dataViews.update(dataViewId, {
      spaceId: scoutSpace.id,
      sourceFilters: [{ value: 'referer' }, { value: 'relatedContent*' }],
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();
    await pageObjects.discover.waitUntilFieldListHasCountOfFields();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('does not expose filtered fields in the field list', async ({ pageObjects }) => {
    const fieldNames = await pageObjects.unifiedFieldList.getAllFieldNames();

    expect(fieldNames).not.toContain('referer');
    expect(fieldNames.filter((fieldName) => fieldName.startsWith('relatedContent'))).toHaveLength(
      0
    );
  });
});
