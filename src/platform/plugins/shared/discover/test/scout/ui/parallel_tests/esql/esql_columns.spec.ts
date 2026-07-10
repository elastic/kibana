/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL column persistence and reset rules in Discover: which columns are
 * shown for transformational (e.g. `KEEP`) vs non-transformational commands,
 * and when changing the query resets the selected columns.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures';
import { testData } from '../../fixtures/common';

spaceTest.describe('Discover ES|QL columns', { tag: '@local-stateful-classic' }, () => {
  spaceTest.use({ viewport: { width: 1600, height: 1200 } });

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.selectTextBaseLang();
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'resets columns only if the index pattern changes for a non-transformational query',
    async ({ pageObjects }) => {
      const { discover } = pageObjects;
      const initialColumns = ['@timestamp', 'Summary'];

      await expect.poll(() => discover.getDocHeader()).toStrictEqual(initialColumns);

      await discover.codeEditor.setCodeEditorValue('from logstash-* | limit 500');
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(initialColumns);

      await discover.codeEditor.setCodeEditorValue('from logs* | limit 500');
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(initialColumns);

      await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(['@timestamp', 'bytes']);

      // different index pattern => reset columns
      await discover.codeEditor.setCodeEditorValue('from logstash-* | limit 500');
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(initialColumns);

      await pageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(['@timestamp', 'extension']);

      // same index pattern => don't reset columns
      const currentQuery = await discover.codeEditor.getCodeEditorValue();
      await discover.codeEditor.setCodeEditorValue(`${currentQuery} | where bytes > 0`);
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(['@timestamp', 'extension']);
    }
  );

  spaceTest(
    'resets columns if available fields or the index pattern differ for a transformational query',
    async ({ pageObjects }) => {
      const { discover } = pageObjects;

      await discover.codeEditor.setCodeEditorValue(
        'from logstash-* | keep ip, @timestamp | limit 500'
      );
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', '@timestamp']);

      // reset columns if available fields are different
      await discover.codeEditor.setCodeEditorValue(
        'from logstash-* | keep ip, @timestamp, bytes | limit 500'
      );
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', '@timestamp', 'bytes']);

      // don't reset columns if available fields and index pattern are the same
      await discover.codeEditor.setCodeEditorValue(
        'from logstash-* | keep ip, @timestamp, bytes | limit 1'
      );
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', '@timestamp', 'bytes']);
      await pageObjects.unifiedFieldList.clickFieldListItemRemove('@timestamp');
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', 'bytes']);

      // reset columns if the index pattern is different
      await discover.codeEditor.setCodeEditorValue(
        'from logs* | keep ip, @timestamp, bytes | limit 1'
      );
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', '@timestamp', 'bytes']);
    }
  );

  spaceTest(
    'recovers from a query error and resets columns correctly for a transformational query',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.codeEditor.setCodeEditorValue('from not_an_index');
      await discover.submitQuery();
      await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeVisible();

      await page.reload();
      await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeVisible();

      await discover.codeEditor.setCodeEditorValue(
        'from logstash-* | keep ip, @timestamp, bytes | limit 10'
      );
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', '@timestamp', 'bytes']);
    }
  );

  spaceTest(
    'sets fields correctly once a query that initially returned no results starts matching data',
    async ({ page, pageObjects }) => {
      const { discover, datePicker } = pageObjects;

      await discover.codeEditor.setCodeEditorValue(
        'from logstash-* | keep ip, @timestamp | limit 500'
      );
      await datePicker.setCommonlyUsedTime('Last_1 hour');
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual([]);

      await page.reload();
      await discover.waitUntilTabIsLoaded();
      await datePicker.setAbsoluteRange(testData.DEFAULT_TIME_RANGE_DISPLAY);
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', '@timestamp']);
    }
  );
});
