/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, type DiscoverPageObjects } from '../../fixtures';

const VERSION_INDEX = 'version-test';

const runFilterTest = async ({
  page,
  pageObjects,
  pinned = false,
}: {
  page: ScoutPage;
  pageObjects: DiscoverPageObjects;
  pinned?: boolean;
}) => {
  const { dataGrid, discover, filterBar, unifiedFieldList } = pageObjects;

  await filterBar.removeAllFilters();
  await unifiedFieldList.clickFieldListItemAdd('extension');

  await expect(dataGrid.getCell(0, 'extension')).toContainText('jpg');
  expect(await discover.getHitCount()).toBe('14,004');

  await filterBar.addFilter({
    field: 'extension.raw',
    operator: 'is',
    value: 'css',
  });

  if (pinned) {
    await filterBar.toggleFilterPinned('extension.raw');
  }

  expect(
    await filterBar.hasFilter({ field: 'extension.raw', value: 'css', enabled: true, pinned })
  ).toBe(true);
  await expect(dataGrid.getCell(0, 'extension')).toContainText('css');
  expect(await discover.getHitCount()).toBe('2,159');

  await page.reload();
  await discover.waitUntilTabIsLoaded();

  expect(
    await filterBar.hasFilter({ field: 'extension.raw', value: 'css', enabled: true, pinned })
  ).toBe(true);
  expect(await discover.getHitCount()).toBe('2,159');
  await expect(dataGrid.getCell(0, 'extension')).toContainText('css');
};

spaceTest.describe('Discover filter editor', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('should add a phrases filter', async ({ pageObjects }) => {
    const { filterBar } = pageObjects;

    await filterBar.addFilter({
      field: 'extension.raw',
      operator: 'is one of',
      value: ['jpg'],
    });

    expect(await filterBar.hasFilter({ field: 'extension.raw', value: 'jpg', enabled: true })).toBe(
      true
    );
  });

  spaceTest('should show the phrases if you re-open a phrases filter', async ({ pageObjects }) => {
    const { filterBar } = pageObjects;

    await filterBar.addFilter({
      field: 'extension.raw',
      operator: 'is one of',
      value: ['jpg'],
    });
    await filterBar.clickEditFilter('extension.raw', 'jpg');

    expect(await filterBar.getFilterEditorSelectedPhrases()).toStrictEqual(['jpg']);

    await filterBar.closeFieldEditorModal();
  });

  spaceTest('should support filtering on nested fields', async ({ pageObjects }) => {
    const { discover, filterBar } = pageObjects;

    await filterBar.addFilter({
      field: 'nestedField.child',
      operator: 'is',
      value: 'nestedValue',
    });

    expect(
      await filterBar.hasFilter({ field: 'nestedField.child', value: 'nestedValue', enabled: true })
    ).toBe(true);
    await discover.waitUntilSearchingHasFinished();
    expect(await discover.getHitCount()).toBe('1');
  });

  spaceTest(
    'should support app filters in histogram/total hits and data grid',
    async ({ page, pageObjects }) => {
      await runFilterTest({ page, pageObjects });
      await expect(pageObjects.dataGrid.getCell(0, 'extension')).toContainText('css');
    }
  );

  spaceTest(
    'should support pinned filters in histogram/total hits and data grid',
    async ({ page, pageObjects }) => {
      await runFilterTest({ page, pageObjects, pinned: true });
      await expect(pageObjects.dataGrid.getCell(0, 'extension')).toContainText('css');
    }
  );

  spaceTest(
    'should support range filter on version fields',
    async ({ apiServices, esClient, pageObjects, scoutSpace }) => {
      const { discover, filterBar } = pageObjects;

      await esClient.indices.delete({ index: VERSION_INDEX, ignore_unavailable: true });
      await esClient.indices.create({
        index: VERSION_INDEX,
        mappings: {
          properties: {
            version: { type: 'version' },
          },
        },
      });

      try {
        await esClient.index({
          index: VERSION_INDEX,
          document: { version: '1.0.0' },
          refresh: true,
        });
        await esClient.index({
          index: VERSION_INDEX,
          document: { version: '2.0.0' },
          refresh: true,
        });
        await apiServices.dataViews.create({
          title: VERSION_INDEX,
          id: VERSION_INDEX,
          name: VERSION_INDEX,
          override: true,
          spaceId: scoutSpace.id,
        });

        await pageObjects.discover.selectDataView(VERSION_INDEX);
        await filterBar.addFilter({
          field: 'version',
          operator: 'is between',
          value: { from: '2.0.0', to: '3.0.0' },
        });
        await pageObjects.discover.waitUntilTabIsLoaded();

        expect(
          await filterBar.hasFilter({ field: 'version', value: '2.0.0 to 3.0.0', enabled: true })
        ).toBe(true);
        expect(await discover.getHitCount()).toBe('1');
      } finally {
        await apiServices.dataViews.delete(VERSION_INDEX, scoutSpace.id);
        await esClient.indices.delete({ index: VERSION_INDEX, ignore_unavailable: true });
      }
    }
  );
});
