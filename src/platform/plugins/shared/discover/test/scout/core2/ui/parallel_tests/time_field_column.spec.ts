/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe('Discover time field column', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace, scoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
    await scoutSpace.uiSettings.unset('defaultColumns');
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'should handle the time field column changes correctly',
    async ({ pageObjects: { dataGrid, discover, unifiedFieldList }, scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultColumns');

      await spaceTest.step('the time field is prepended by the grid, not selected', async () => {
        expect(await dataGrid.getColumnTitles()).toStrictEqual(['@timestamp', 'Summary']);
        expect(await unifiedFieldList.isFieldSelected('@timestamp')).toBe(false);
      });

      await spaceTest.step('it stays first when other fields are added', async () => {
        await unifiedFieldList.clickFieldListItemAdd('bytes');
        await unifiedFieldList.clickFieldListItemAdd('extension');
        await expect
          .poll(() => dataGrid.getColumnTitles())
          .toStrictEqual(['@timestamp', 'bytes', 'extension']);
      });

      await spaceTest.step('selecting it appends it as a regular column', async () => {
        await unifiedFieldList.clickFieldListItemAdd('@timestamp');
        await expect
          .poll(() => dataGrid.getColumnTitles())
          .toStrictEqual(['bytes', 'extension', '@timestamp']);
      });

      await spaceTest.step('the selected time field moves like any other column', async () => {
        await discover.moveColumn('@timestamp', 'left');
        await expect
          .poll(() => dataGrid.getColumnTitles())
          .toStrictEqual(['bytes', '@timestamp', 'extension']);
      });

      await spaceTest.step('moving it back to the front makes it implicit again', async () => {
        await discover.moveColumn('@timestamp', 'left');
        await expect
          .poll(() => dataGrid.getColumnTitles())
          .toStrictEqual(['@timestamp', 'bytes', 'extension']);
        await expect.poll(() => unifiedFieldList.isFieldSelected('@timestamp')).toBe(false);
      });

      await spaceTest.step('the implicit time field column cannot be removed', async () => {
        await unifiedFieldList.clickFieldListItemRemove('@timestamp');
        await expect
          .poll(() => dataGrid.getColumnTitles())
          .toStrictEqual(['@timestamp', 'bytes', 'extension']);
      });

      await spaceTest.step('removing the other fields restores the initial state', async () => {
        await unifiedFieldList.clickFieldListItemRemove('bytes');
        await unifiedFieldList.clickFieldListItemRemove('extension');
        await expect
          .poll(() => dataGrid.getColumnTitles())
          .toStrictEqual(['@timestamp', 'Summary']);
      });
    }
  );
});
