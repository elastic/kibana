/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '../fixtures';

spaceTest.describe(
  'Discover sidebar field stats with filters',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterEach(async ({ pageObjects }) => {
      await pageObjects.filterBar.removeAllFilters();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'updates top values for regular and pinned filters',
      async ({ page, pageObjects }) => {
        const { discover, filterBar, unifiedFieldList } = pageObjects;

        await unifiedFieldList.clickFieldListItem('extension');
        await unifiedFieldList.waitUntilFieldPopoverIsLoaded();
        const unfilteredTopValues = unifiedFieldList.getFieldStatsTopValues();
        await expect(unfilteredTopValues).toBeVisible();
        await expect(unfilteredTopValues).not.toHaveText('');
        const unfilteredTopValuesText = await unfilteredTopValues.innerText();
        await unifiedFieldList.closeFieldPopover();

        await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'jpg' });
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.clickFieldListItem('extension');
        await unifiedFieldList.waitUntilFieldPopoverIsLoaded();
        const filteredTopValues = unifiedFieldList.getFieldStatsTopValues();
        await expect(filteredTopValues).toContainText('jpg');
        await expect(filteredTopValues).not.toHaveText(unfilteredTopValuesText, {
          useInnerText: true,
        });
        await unifiedFieldList.closeFieldPopover();

        await filterBar.toggleFilterNegated('extension');
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.clickFieldListItem('extension');
        await unifiedFieldList.waitUntilFieldPopoverIsLoaded();
        const negatedTopValues = unifiedFieldList.getFieldStatsTopValues();
        await expect(negatedTopValues).not.toContainText('jpg\n100%');
        await expect(negatedTopValues).not.toHaveText('');
        const negatedTopValuesText = await negatedTopValues.innerText();
        await unifiedFieldList.closeFieldPopover();

        await filterBar.toggleFilterPinned('extension');
        await discover.waitUntilSearchingHasFinished();

        await page.reload();
        await discover.waitUntilTabIsLoaded();

        await unifiedFieldList.clickFieldListItem('extension');
        await unifiedFieldList.waitUntilFieldPopoverIsLoaded();
        await expect(unifiedFieldList.getFieldStatsTopValues()).toHaveText(negatedTopValuesText, {
          useInnerText: true,
        });
        await unifiedFieldList.closeFieldPopover();

        await filterBar.toggleFilterEnabled('extension');
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.clickFieldListItem('extension');
        await unifiedFieldList.waitUntilFieldPopoverIsLoaded();
        await expect(unifiedFieldList.getFieldStatsTopValues()).toHaveText(
          unfilteredTopValuesText,
          { useInnerText: true }
        );
        await unifiedFieldList.closeFieldPopover();
      }
    );
  }
);
