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
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'resets columns only if the index pattern changes for a non-transformational query',
    async ({ pageObjects }) => {
      const { discover } = pageObjects;
      const initialColumns = ['@timestamp', 'Summary'];
      await discover.expectDocHeaderToEqual(initialColumns);

      await discover.codeEditor.setCodeEditorValue('from logstash-* | limit 500');
      await discover.submitQuery();
      await discover.expectDocHeaderToEqual(initialColumns);

      await discover.codeEditor.setCodeEditorValue('from logs* | limit 500');
      await discover.submitQuery();
      await discover.expectDocHeaderToEqual(initialColumns);

      await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await discover.expectDocHeaderToEqual(['@timestamp', 'bytes']);

      // different index pattern => reset columns
      await discover.codeEditor.setCodeEditorValue('from logstash-* | limit 500');
      await discover.submitQuery();
      await discover.expectDocHeaderToEqual(initialColumns);

      await pageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
      await discover.expectDocHeaderToEqual(['@timestamp', 'extension']);

      // same index pattern => don't reset columns
      const currentQuery = await discover.codeEditor.getCodeEditorValue();
      await discover.codeEditor.setCodeEditorValue(`${currentQuery} | where bytes > 0`);
      await discover.submitQuery();
      await discover.expectDocHeaderToEqual(['@timestamp', 'extension']);
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
      await discover.expectDocHeaderToEqual(['ip', '@timestamp', 'bytes']);
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
      await discover.expectDocHeaderToEqual([]);

      await page.reload();
      await discover.waitUntilTabIsLoaded();
      await datePicker.setAbsoluteRange(testData.DEFAULT_TIME_RANGE_DISPLAY);
      await discover.expectDocHeaderToEqual(['ip', '@timestamp']);
    }
  );

  spaceTest(
    'formats a column using columnsMeta when its type differs from the data-view field',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;
      // The query preserves the original `ip` field in `ipORIG`, then replaces
      // `ip` with a string array. Although the data view defines `ip` as an IP
      // field, ES|QL returns a keyword array for it, so the column type icons
      // must follow the ES|QL result types rather than the data-view field types.
      const query =
        'FROM logstash* | LIMIT 1 | EVAL ipORIG = ip | EVAL ip = ["a", "b"] | KEEP ip, ipORIG';
      await discover.codeEditor.setCodeEditorValue(query);
      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await expect(
        page.testSubj.locator('dataGridHeaderCell-ipORIG').locator('[aria-label="IP address"]')
      ).toBeVisible();
      await expect(
        page.testSubj.locator('dataGridHeaderCell-ip').locator('[aria-label="Keyword"]')
      ).toBeVisible();
    }
  );
});
