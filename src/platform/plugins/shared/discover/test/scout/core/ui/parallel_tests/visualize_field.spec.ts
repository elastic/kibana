/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License 3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

spaceTest.describe('Discover field visualization', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await pageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'opens a field in Lens with its suggested dimensions',
    async ({ page, pageObjects }) => {
      await pageObjects.unifiedFieldList.clickFieldListItemVisualize('bytes');

      await expect(page.testSubj.locator('lns-dimensionTrigger')).toHaveCount(2);
      await expect(
        page.testSubj.locator('lns-dimensionTrigger').filter({ hasText: 'Median of bytes' })
      ).toBeVisible();
    }
  );

  spaceTest('preserves filters when visualizing a field in Lens', async ({ pageObjects }) => {
    const { filterBar, unifiedFieldList } = pageObjects;

    await filterBar.addFilter({
      field: 'bytes',
      operator: 'is between',
      value: { from: '3500', to: '4000' },
    });
    await unifiedFieldList.clickFieldListItemVisualize('geo.src');

    expect(await filterBar.hasFilter({ field: 'bytes', value: '3,500 to 4,000' })).toBe(true);
  });

  spaceTest('preserves the query when visualizing a field in Lens', async ({ pageObjects }) => {
    const { discover, queryBar, unifiedFieldList } = pageObjects;

    await discover.writeAndSubmitKqlQuery('machine.os : ios');
    await unifiedFieldList.clickFieldListItemVisualize('geo.dest');

    expect(await queryBar.getQuery()).toBe('machine.os : ios');
  });

  spaceTest('opens the histogram breakdown in Lens', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    await discover.chooseBreakdownField('extension.raw');
    await discover.waitUntilTabIsLoaded();
    await discover.navigateToLensEditor();

    await expect(
      page.testSubj.locator('lnsDragDrop_domDraggable_Top 9 values of extension.raw')
    ).toHaveText('Top 9 values of extension.raw');
  });

  spaceTest(
    'preserves an ad hoc data view when opening the histogram in Lens',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.createDataViewFromSearchBar({ name: 'logst', adHoc: true });
      await discover.navigateToLensEditor();

      await expect(page.testSubj.locator('lns-dataView-switch-link')).toHaveText('logst*');
    }
  );
});
