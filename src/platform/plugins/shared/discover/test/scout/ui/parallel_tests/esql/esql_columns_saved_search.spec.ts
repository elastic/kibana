/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL saved-search column persistence: initial and custom columns for both
 * non-transformational and transformational commands are saved, restored on
 * reload, and restored again when switching between saved searches.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures';
import { testData } from '../../fixtures/common';

const SAVED_SEARCH_NON_TRANSFORMATIONAL_INITIAL_COLUMNS = 'nonTransformationalInitialColumns';
const SAVED_SEARCH_NON_TRANSFORMATIONAL_CUSTOM_COLUMNS = 'nonTransformationalCustomColumns';
const SAVED_SEARCH_TRANSFORMATIONAL_INITIAL_COLUMNS = 'transformationalInitialColumns';
const SAVED_SEARCH_TRANSFORMATIONAL_CUSTOM_COLUMNS = 'transformationalCustomColumns';

spaceTest.describe(
  'Discover ES|QL columns - saved searches / discover sessions',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'persists columns in saved searches and restores them on reload and re-selection',
      async ({ page, pageObjects }) => {
        spaceTest.setTimeout(180_000);
        const { discover, unifiedFieldList } = pageObjects;

        await spaceTest.step(
          'save initial columns for a non-transformational command',
          async () => {
            const columns = ['@timestamp', 'Summary'];
            await expect.poll(() => discover.getDocHeader()).toStrictEqual(columns);

            await page.reload();
            await discover.waitUntilTabIsLoaded();
            await expect.poll(() => discover.getDocHeader()).toStrictEqual(columns);

            await discover.saveSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_INITIAL_COLUMNS);
            await discover.waitUntilTabIsLoaded();
            await expect.poll(() => discover.getDocHeader()).toStrictEqual(columns);
          }
        );

        await spaceTest.step('save custom columns for a non-transformational command', async () => {
          await discover.clickNewSearch();
          await discover.waitUntilTabIsLoaded();

          const columns = ['@timestamp', 'bytes', 'extension'];
          await unifiedFieldList.clickFieldListItemAdd('bytes');
          await unifiedFieldList.clickFieldListItemAdd('extension');
          await discover.waitUntilTabIsLoaded();
          await expect.poll(() => discover.getDocHeader()).toStrictEqual(columns);

          await page.reload();
          await discover.waitUntilTabIsLoaded();
          await expect.poll(() => discover.getDocHeader()).toStrictEqual(columns);

          await discover.saveSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_CUSTOM_COLUMNS);
          await discover.waitUntilTabIsLoaded();
          await expect.poll(() => discover.getDocHeader()).toStrictEqual(columns);
        });

        await spaceTest.step('save initial columns for a transformational command', async () => {
          await discover.clickNewSearch();
          await discover.waitUntilTabIsLoaded();

          const columns = ['ip', '@timestamp'];
          await discover.codeEditor.setCodeEditorValue(
            'from logstash-* | limit 500 | keep ip, @timestamp'
          );
          await discover.submitQuery();
          await discover.waitUntilTabIsLoaded();
          await expect.poll(() => discover.getDocHeader()).toStrictEqual(columns);

          await page.reload();
          await discover.waitUntilTabIsLoaded();
          await expect.poll(() => discover.getDocHeader()).toStrictEqual(columns);

          await discover.saveSearch(SAVED_SEARCH_TRANSFORMATIONAL_INITIAL_COLUMNS);
          await discover.waitUntilTabIsLoaded();
          await expect.poll(() => discover.getDocHeader()).toStrictEqual(columns);
        });

        await spaceTest.step('save custom columns for a transformational command', async () => {
          await discover.clickNewSearch();
          await discover.waitUntilTabIsLoaded();

          await discover.codeEditor.setCodeEditorValue(
            'from logstash-* | limit 500 | keep ip, @timestamp, bytes'
          );
          await discover.submitQuery();
          await discover.waitUntilTabIsLoaded();
          await expect
            .poll(() => discover.getDocHeader())
            .toStrictEqual(['ip', '@timestamp', 'bytes']);

          await unifiedFieldList.clickFieldListItemRemove('@timestamp');
          await discover.waitUntilTabIsLoaded();
          await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', 'bytes']);

          await page.reload();
          await discover.waitUntilTabIsLoaded();
          await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', 'bytes']);

          await discover.saveSearch(SAVED_SEARCH_TRANSFORMATIONAL_CUSTOM_COLUMNS);
          await discover.waitUntilTabIsLoaded();
          await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', 'bytes']);
        });

        await spaceTest.step(
          'restore columns correctly when switching between saved searches',
          async () => {
            await discover.loadSavedSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_INITIAL_COLUMNS);
            await discover.waitUntilTabIsLoaded();
            await expect
              .poll(() => discover.getDocHeader())
              .toStrictEqual(['@timestamp', 'Summary']);

            await discover.loadSavedSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_CUSTOM_COLUMNS);
            await discover.waitUntilTabIsLoaded();
            await expect
              .poll(() => discover.getDocHeader())
              .toStrictEqual(['@timestamp', 'bytes', 'extension']);

            await discover.loadSavedSearch(SAVED_SEARCH_TRANSFORMATIONAL_INITIAL_COLUMNS);
            await discover.waitUntilTabIsLoaded();
            await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', '@timestamp']);

            await discover.loadSavedSearch(SAVED_SEARCH_TRANSFORMATIONAL_CUSTOM_COLUMNS);
            await discover.waitUntilTabIsLoaded();
            await expect.poll(() => discover.getDocHeader()).toStrictEqual(['ip', 'bytes']);

            await discover.clickNewSearch();
            await discover.waitUntilTabIsLoaded();
            await expect
              .poll(() => discover.getDocHeader())
              .toStrictEqual(['@timestamp', 'Summary']);
          }
        );
      }
    );
  }
);
