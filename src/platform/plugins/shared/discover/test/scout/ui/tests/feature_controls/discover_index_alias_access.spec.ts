/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { DEFAULT_TIME_RANGE, DISCOVER_KBN_ARCHIVE } from '../../fixtures/common/constants';
import { DISCOVER_ONLY_DATA_VIEWS_ROLE } from '../../fixtures/feature_controls/constants';

const LOGSTASH_INDEX_NAME = 'logstash-2015.09.22';
const ALIAS_NAME = 'alias-logstash-discover';

test.describe(
  'Discover feature controls — index alias access',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ esClient, kbnClient }) => {
      await esClient.indices.updateAliases({
        actions: [{ add: { index: LOGSTASH_INDEX_NAME, alias: ALIAS_NAME } }],
      });
      await kbnClient.importExport.load(DISCOVER_KBN_ARCHIVE);
      await kbnClient.savedObjects.create({
        type: 'index-pattern',
        attributes: { title: ALIAS_NAME, timeFieldName: '@timestamp' },
        overwrite: true,
      });
      await kbnClient.uiSettings.update({
        'timepicker:timeDefaults': JSON.stringify(DEFAULT_TIME_RANGE),
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(DISCOVER_ONLY_DATA_VIEWS_ROLE(ALIAS_NAME));
      await pageObjects.discover.goto({ queryMode: 'classic' });
    });

    test.afterAll(async ({ esClient, kbnClient }) => {
      await esClient.indices.updateAliases({
        actions: [{ remove: { index: LOGSTASH_INDEX_NAME, alias: ALIAS_NAME } }],
      });
      await kbnClient.uiSettings.unset('timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('blocks direct index access but allows access via a permitted alias', async ({
      page,
      pageObjects,
    }) => {
      await expect(page.testSubj.locator('discover-readonly-badge')).toBeVisible();

      await test.step("can't access the logstash index directly", async () => {
        await pageObjects.discover.selectDataView('logstash-*');
        await expect(page.testSubj.locator('discoverNoResultsCheckIndices')).toBeVisible();
      });

      await test.step('can access the logstash index via a permitted alias', async () => {
        await pageObjects.discover.selectDataView(ALIAS_NAME);
        await expect(page.testSubj.locator('discoverNoResultsCheckIndices')).toBeHidden();
        await pageObjects.dataGrid.waitForLoad();
        await pageObjects.dataGrid.waitForDocTableRendered();
      });

      await test.step('the retrieved document belongs to the aliased logstash index', async () => {
        await pageObjects.docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await pageObjects.docViewer.openTab('doc_view_source');
        const doc = await pageObjects.docViewer.readJsonFromCodeEditor<{ _index: string }>();
        expect(doc._index).toBe(LOGSTASH_INDEX_NAME);
        await pageObjects.docViewer.close();
      });
    });
  }
);
