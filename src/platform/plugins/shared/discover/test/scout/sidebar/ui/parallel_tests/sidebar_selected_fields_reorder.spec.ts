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

const SELECTED_FIELDS = ['extension', 'bytes', 'machine.os'];
const TIME_COLUMN = '@timestamp';

spaceTest.describe(
  'Discover sidebar selected fields reordering',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      for (const field of SELECTED_FIELDS) {
        await unifiedFieldList.clickFieldListItemAdd(field);
      }
      await discover.waitUntilSearchingHasFinished();
    });

    spaceTest.afterEach(async ({ pageObjects }) => {
      await pageObjects.unifiedFieldList.cleanSidebarLocalStorage();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'should reorder the table columns by moving a selected field with the keyboard',
      async ({ pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await expect
          .poll(() => unifiedFieldList.getSidebarSectionFieldNames('selected'))
          .toStrictEqual(SELECTED_FIELDS);
        await expect
          .poll(() => discover.getDocHeader())
          .toStrictEqual([TIME_COLUMN, ...SELECTED_FIELDS]);

        await unifiedFieldList.reorderSelectedFieldWithKeyboard('extension', 'down', 2);

        await expect
          .poll(() => unifiedFieldList.getSidebarSectionFieldNames('selected'))
          .toStrictEqual(['bytes', 'machine.os', 'extension']);
        await expect
          .poll(() => discover.getDocHeader())
          .toStrictEqual([TIME_COLUMN, 'bytes', 'machine.os', 'extension']);

        await unifiedFieldList.reorderSelectedFieldWithKeyboard('extension', 'up', 1);

        await expect
          .poll(() => unifiedFieldList.getSidebarSectionFieldNames('selected'))
          .toStrictEqual(['bytes', 'extension', 'machine.os']);
        await expect
          .poll(() => discover.getDocHeader())
          .toStrictEqual([TIME_COLUMN, 'bytes', 'extension', 'machine.os']);
      }
    );

    spaceTest(
      'should reorder the table columns by dragging a selected field onto another one',
      async ({ pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await expect
          .poll(() => unifiedFieldList.getSidebarSectionFieldNames('selected'))
          .toStrictEqual(SELECTED_FIELDS);
        await expect
          .poll(() => discover.getDocHeader())
          .toStrictEqual([TIME_COLUMN, ...SELECTED_FIELDS]);

        await unifiedFieldList.dragSelectedFieldOnto('machine.os', 'extension');

        await expect
          .poll(() => unifiedFieldList.getSidebarSectionFieldNames('selected'))
          .toStrictEqual(['machine.os', 'extension', 'bytes']);
        await expect
          .poll(() => discover.getDocHeader())
          .toStrictEqual([TIME_COLUMN, 'machine.os', 'extension', 'bytes']);
      }
    );
  }
);
