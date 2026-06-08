/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, resolveDataViewId } from '../../../fixtures/surrounding_docs';

const TEST_COLUMN_NAMES = testData.FILTER_COLUMNS;

spaceTest.describe(
  'Discover context - filters (advanced)',
  { tag: testData.CONTEXT_DEPLOYMENT_AGNOSTIC_TAGS },
  () => {
    let dataViewId: string;

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_VISUALIZE);
      dataViewId = resolveDataViewId(imported, testData.LOGSTASH_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultIndex(testData.LOGSTASH_DATA_VIEW);
      await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.contextPage.navigateTo(dataViewId, testData.LOGSTASH_ANCHOR_ID, {
        columns: TEST_COLUMN_NAMES,
      });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'discover:rowHeightOption');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should add OR filter', async ({ pageObjects }) => {
      await pageObjects.filterBar.openFilterBuilder();
      await pageObjects.filterBar.addOrFilter('0');
      await pageObjects.filterBar.fillFilterForm('0.0', {
        field: 'extension',
        operator: 'is',
        value: 'png',
      });
      await pageObjects.filterBar.fillFilterForm('0.1', {
        field: 'bytes',
        operator: 'is between',
        value: { from: '1000', to: '2000' },
      });
      await pageObjects.filterBar.saveAndCloseFilterBuilder();
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      expect(await pageObjects.filterBar.getFilterCount()).toBe(1);
      expect(await pageObjects.filterBar.hasFilterWithId('0')).toBe(true);

      await spaceTest.step('verify filter preview text', async () => {
        await pageObjects.filterBar.clickEditFilterById('0');
        expect(await pageObjects.filterBar.getFilterEditorPreview()).toBe(
          'extension: png OR bytes: 1,000B to 2KB'
        );
      });
    });

    spaceTest('should add AND filter', async ({ pageObjects }) => {
      await pageObjects.filterBar.openFilterBuilder();
      await pageObjects.filterBar.addAndFilter('0');
      await pageObjects.filterBar.fillFilterForm('0.0', {
        field: 'extension',
        operator: 'is one of',
        value: ['png', 'jpeg'],
      });
      await pageObjects.filterBar.fillFilterForm('0.1', {
        field: 'bytes',
        operator: 'is between',
        value: { from: '1000', to: '2000' },
      });
      await pageObjects.filterBar.saveAndCloseFilterBuilder();
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      expect(await pageObjects.filterBar.getFilterCount()).toBe(1);
      expect(await pageObjects.filterBar.hasFilterWithId('0')).toBe(true);

      await spaceTest.step('verify filter preview text', async () => {
        await pageObjects.filterBar.clickEditFilterById('0');
        expect(await pageObjects.filterBar.getFilterEditorPreview()).toBe(
          'extension: is one of png, jpeg AND bytes: 1,000B to 2KB'
        );
      });
    });

    spaceTest('should add nested filters', async ({ pageObjects }) => {
      await pageObjects.filterBar.openFilterBuilder();
      await pageObjects.filterBar.addAndFilter('0');
      await pageObjects.filterBar.addOrFilter('0.0');
      await pageObjects.filterBar.fillFilterForm('0.0.0', {
        field: 'clientip',
        operator: 'does not exist',
      });
      await pageObjects.filterBar.fillFilterForm('0.0.1', {
        field: 'extension',
        operator: 'is one of',
        value: ['png', 'jpeg'],
      });
      await pageObjects.filterBar.fillFilterForm('0.1', {
        field: 'bytes',
        operator: 'is between',
        value: { from: '1000', to: '2000' },
      });
      await pageObjects.filterBar.saveAndCloseFilterBuilder();
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      expect(await pageObjects.filterBar.getFilterCount()).toBe(1);
      expect(await pageObjects.filterBar.hasFilterWithId('0')).toBe(true);

      await spaceTest.step('verify filter preview text', async () => {
        await pageObjects.filterBar.clickEditFilterById('0');
        expect(await pageObjects.filterBar.getFilterEditorPreview()).toBe(
          '(NOT clientip: exists OR extension: is one of png, jpeg) AND bytes: 1,000B to 2KB'
        );
      });
    });

    spaceTest('should add comma delimiter values for is one of', async ({ pageObjects }) => {
      await pageObjects.filterBar.openFilterBuilder();
      await pageObjects.filterBar.fillFilterForm('0', {
        field: 'extension',
        operator: 'is one of',
        value: 'png, jpeg',
      });
      await pageObjects.filterBar.saveAndCloseFilterBuilder();
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      expect(await pageObjects.filterBar.getFilterCount()).toBe(1);
      expect(await pageObjects.filterBar.hasFilterWithId('0')).toBe(true);

      await spaceTest.step('verify filter preview text', async () => {
        await pageObjects.filterBar.clickEditFilterById('0');
        expect(await pageObjects.filterBar.getFilterEditorPreview()).toBe(
          'extension: is one of png, jpeg'
        );
      });
    });

    spaceTest('should display negated values correctly', async ({ pageObjects }) => {
      await pageObjects.filterBar.addFilter({
        field: 'extension',
        operator: 'is not',
        value: 'png',
      });
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      const filterLabels = await pageObjects.filterBar.getFiltersLabel();
      expect(filterLabels[0]).toBe('NOT extension: png');

      await spaceTest.step('edit filter to add AND condition', async () => {
        await pageObjects.filterBar.clickEditFilterById('0');
        await pageObjects.filterBar.addAndFilter('0');
        await pageObjects.filterBar.fillFilterForm('0.1', {
          field: 'extension',
          operator: 'is',
          value: 'jpeg',
        });
        await pageObjects.filterBar.saveAndCloseFilterBuilder();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();
      });

      const updatedLabels = await pageObjects.filterBar.getFiltersLabel();
      expect(updatedLabels[0]).toBe('NOT extension: png AND extension: jpeg');
    });
  }
);
