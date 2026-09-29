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

spaceTest.describe('Discover sidebar data view switching', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace, kbnClient }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    await discoverScoutSpace.savedObjects.load(
      testData.INDEX_PATTERN_WITHOUT_TIMEFIELD_KBN_ARCHIVE
    );
    await kbnClient.savedObjects.create({
      type: 'index-pattern',
      id: 'missing-sidebar-index',
      overwrite: true,
      space: discoverScoutSpace.id,
      attributes: {
        title: 'missing-sidebar-index-*',
        timeFieldName: '@timestamp',
      },
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    // Security serverless editor/viewer cannot read `with-timefield`.
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'shows an empty field list for a data view whose index is missing',
    async ({ pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await unifiedFieldList.expectAvailableFieldCount(testData.LOGSTASH_AVAILABLE_FIELD_COUNT);

      await discover.selectDataView('missing-sidebar-index-*');
      await discover.waitUntilSearchingHasFinished();

      await unifiedFieldList.expectAvailableFieldCount(0);
      await expect(unifiedFieldList.getNoFieldsCallout('available', 'noFieldsExist')).toBeVisible();

      await discover.selectDataView(testData.DEFAULT_DATA_VIEW);
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.expectAvailableFieldCount(testData.LOGSTASH_AVAILABLE_FIELD_COUNT);
    }
  );

  spaceTest('updates the sidebar when switching data views', async ({ pageObjects }) => {
    const { discover, unifiedFieldList } = pageObjects;

    await unifiedFieldList.expectAvailableFieldCount(testData.LOGSTASH_AVAILABLE_FIELD_COUNT);

    await discover.selectDataView('without-timefield');
    await discover.waitUntilSearchingHasFinished();
    await unifiedFieldList.expectAvailableFieldCount(6);
    await unifiedFieldList.expectSidebarSectionFieldCount(
      'meta',
      testData.LOGSTASH_META_FIELD_COUNT
    );

    await discover.selectDataView('with-timefield');
    await discover.waitUntilSearchingHasFinished();
    await unifiedFieldList.expectAvailableFieldCount(0);
    await unifiedFieldList.expectSidebarSectionFieldCount('empty', 7);
    await expect(unifiedFieldList.getNoFieldsCallout('available', 'noFieldsMatch')).toBeVisible();

    await discover.selectDataView(testData.DEFAULT_DATA_VIEW);
    await discover.waitUntilSearchingHasFinished();
    await unifiedFieldList.expectAvailableFieldCount(testData.LOGSTASH_AVAILABLE_FIELD_COUNT);
  });

  spaceTest(
    'updates available fields when the time range includes matching documents',
    async ({ pageObjects }) => {
      const { datePicker, discover, unifiedFieldList } = pageObjects;

      await discover.selectDataView('with-timefield');
      await discover.waitUntilSearchingHasFinished();
      await expect(unifiedFieldList.getNoFieldsCallout('available', 'noFieldsMatch')).toBeVisible();

      await datePicker.setAbsoluteRange({
        from: 'Sep 21, 2019 @ 00:00:00.000',
        to: 'Sep 23, 2019 @ 00:00:00.000',
      });
      await discover.waitUntilSearchingHasFinished();

      await unifiedFieldList.expectAvailableFieldCount(7);
      await unifiedFieldList.expectSidebarSectionFieldCount(
        'meta',
        testData.LOGSTASH_META_FIELD_COUNT
      );
    }
  );
});
