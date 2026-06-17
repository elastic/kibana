/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { navigateToDataViewsManagement } from '../../fixtures/helpers';

test.describe('Data view create/delete stateful coverage', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded('src/platform/test/functional/fixtures/es_archiver/makelogs');
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/index_pattern_without_timefield'
    );
  });

  test.beforeEach(async ({ browserAuth, page, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    await kbnClient.uiSettings.replace({});
    await navigateToDataViewsManagement(page);
  });

  test('resets time field after changing to index without timestamp', async ({ page }) => {
    await page.testSubj.click('createDataViewButton');
    await page.testSubj.fill('createIndexPatternTitleInput', 'without-timefield');
    await page.testSubj.click('saveIndexPatternButton');

    await expect(page.testSubj.locator('indexPatternTitle')).toContainText('without-timefield');
    await expect(page.testSubj.locator('currentIndexPatternTimeField')).toBeHidden();
  });

  test('supports unmatched index pattern segments', async ({ page }) => {
    await page.testSubj.click('createDataViewButton');
    await page.testSubj.fill('createIndexPatternTitleInput', 'l*,z*');
    await expect(page.testSubj.locator('saveIndexPatternButton')).toBeEnabled();
  });

  test('creates data view against hidden indices and persists allow hidden toggle', async ({
    esClient,
    page,
  }) => {
    await esClient.indices.create({
      index: 'logstash-hidden-1',
      settings: { 'index.hidden': true },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
        },
      },
    });

    await esClient.index({
      index: 'logstash-hidden-1',
      document: { '@timestamp': '2024-01-01T00:00:00.000Z' },
      refresh: 'wait_for',
    });

    await page.testSubj.click('createDataViewButton');
    await page.testSubj.fill('createIndexPatternTitleInput', 'logstash-hidden*');
    await page.testSubj.click('toggleAdvancedSetting');
    await page.testSubj.click('allowHiddenField');
    await page.testSubj.click('saveIndexPatternButton');

    await expect(page.testSubj.locator('indexPatternTitle')).toContainText('logstash-hidden*');
    await page.reload();
    await page.testSubj.click('editIndexPatternButton');
    await expect(page.testSubj.locator('indexPatternTitle')).toContainText('logstash-hidden*');
  });
});
