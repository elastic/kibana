/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const RUNTIME_FIELD_SCRIPT = 'emit("runtime field value")';

type FieldState = 'visible' | 'hidden';

const dataViewCases = [
  {
    isAdHocDataView: true,
    type: 'ad hoc',
    sameDataViewCount: 2,
    secondDataViewName: 'logs',
    newFieldStateInOriginalTab: 'hidden',
    editedFieldStateInOriginalTab: 'hidden',
  },
  {
    isAdHocDataView: false,
    type: 'persisted',
    sameDataViewCount: 1,
    secondDataViewName: 'log',
    newFieldStateInOriginalTab: 'visible',
    editedFieldStateInOriginalTab: 'visible',
  },
] as const;

const createName = (prefix: string, scoutSpaceId: string) =>
  `${prefix}_${scoutSpaceId.replace(/-/g, '_')}`;

const prepareDataView = async ({
  isAdHocDataView,
  pageObjects,
  name,
}: {
  isAdHocDataView: boolean;
  pageObjects: PageObjects;
  name: string;
}) => {
  if (!isAdHocDataView) {
    return;
  }

  await pageObjects.discover.createDataViewFromSearchBar({ name, adHoc: true });
  await pageObjects.discover.waitUntilTabIsLoaded();
};

const expectFieldState = async ({
  pageObjects,
  fieldName,
  state,
}: {
  pageObjects: PageObjects;
  fieldName: string;
  state: FieldState;
}) => {
  const { unifiedFieldList } = pageObjects;

  await unifiedFieldList.searchField(fieldName);
  const field = unifiedFieldList.getAvailableField(fieldName);

  if (state === 'visible') {
    await field.waitFor({ state: 'visible' });
  } else {
    await field.waitFor({ state: 'hidden' });
  }
};

spaceTest.describe('Discover tabs - data view editing', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeEach(async ({ browserAuth, discoverScoutSpace, pageObjects }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterEach(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  for (const {
    isAdHocDataView,
    type,
    sameDataViewCount,
    secondDataViewName,
    newFieldStateInOriginalTab,
    editedFieldStateInOriginalTab,
  } of dataViewCases) {
    spaceTest(`can edit ${type} data view name`, async ({ pageObjects, scoutSpace }) => {
      const { discover, unifiedTabs } = pageObjects;
      const editedName = createName('logstash-edited-name', scoutSpace.id);

      await prepareDataView({
        isAdHocDataView,
        pageObjects,
        name: 'logstash',
      });

      const previousName = await discover.getSelectedDataViewName();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getSelectedDataViewName()).toBe(previousName);

      await discover.editCurrentDataViewName(editedName);
      expect(await discover.getSelectedDataViewName()).toBe(editedName);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getSelectedDataViewName()).toBe(editedName);

      const availableDataViews = await discover.getAvailableDataViewsFromSearchBar();
      expect(availableDataViews).not.toContain(previousName);
      expect(availableDataViews).toContain(editedName);
    });

    spaceTest(
      `can create runtime fields for the same ${type} data view in both tabs`,
      async ({ pageObjects, scoutSpace }) => {
        const { discover, unifiedFieldList, unifiedTabs } = pageObjects;

        await prepareDataView({
          isAdHocDataView,
          pageObjects,
          name: 'logst',
        });

        const currentName = await discover.getSelectedDataViewName();
        const newFieldName = createName('_test_new_field', scoutSpace.id);
        const editedFieldName = createName('_test_new_field_edited', scoutSpace.id);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSelectedDataViewName()).toBe(currentName);

        await discover.createRuntimeField(newFieldName, RUNTIME_FIELD_SCRIPT);
        await unifiedFieldList.searchField(newFieldName);
        await unifiedFieldList.getAvailableField(newFieldName).waitFor({ state: 'visible' });

        let availableDataViews = await discover.getAvailableDataViewsFromSearchBar();
        expect(availableDataViews.filter((name) => name === currentName)).toHaveLength(
          sameDataViewCount
        );

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSelectedDataViewName()).toBe(currentName);
        await expectFieldState({
          pageObjects,
          fieldName: newFieldName,
          state: newFieldStateInOriginalTab,
        });

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSelectedDataViewName()).toBe(currentName);
        await unifiedFieldList.searchField(newFieldName);
        await unifiedFieldList.getAvailableField(newFieldName).waitFor({ state: 'visible' });

        await unifiedFieldList.openFieldEditor(newFieldName);
        await discover.renameRuntimeField(editedFieldName);
        await unifiedFieldList.searchField(editedFieldName);
        await unifiedFieldList.getAvailableField(editedFieldName).waitFor({ state: 'visible' });
        await unifiedFieldList.searchField(newFieldName);
        await unifiedFieldList.getAvailableField(newFieldName).waitFor({ state: 'hidden' });

        availableDataViews = await discover.getAvailableDataViewsFromSearchBar();
        expect(availableDataViews.filter((name) => name === currentName)).toHaveLength(
          sameDataViewCount
        );

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSelectedDataViewName()).toBe(currentName);
        await expectFieldState({
          pageObjects,
          fieldName: editedFieldName,
          state: editedFieldStateInOriginalTab,
        });
        await expectFieldState({ pageObjects, fieldName: newFieldName, state: 'hidden' });
      }
    );

    spaceTest(
      `can create runtime fields for a different ${type} data view`,
      async ({ pageObjects, scoutSpace }) => {
        const { discover, unifiedFieldList, unifiedTabs } = pageObjects;
        const firstTabName = await discover.getSelectedDataViewName();
        const newFieldName = createName('_test_new_field2', scoutSpace.id);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.createDataViewFromSearchBar({
          name: secondDataViewName,
          adHoc: isAdHocDataView,
        });
        await discover.waitUntilTabIsLoaded();
        const secondTabName = await discover.getSelectedDataViewName();

        await discover.createRuntimeField(newFieldName, RUNTIME_FIELD_SCRIPT);
        await unifiedFieldList.searchField(newFieldName);
        await unifiedFieldList.getAvailableField(newFieldName).waitFor({ state: 'visible' });

        const availableDataViews = await discover.getAvailableDataViewsFromSearchBar();
        expect(availableDataViews.filter((name) => name === firstTabName)).toHaveLength(1);
        expect(availableDataViews.filter((name) => name === secondTabName)).toHaveLength(1);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSelectedDataViewName()).toBe(firstTabName);
        await unifiedFieldList.searchField(newFieldName);
        await unifiedFieldList.getAvailableField(newFieldName).waitFor({ state: 'hidden' });

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSelectedDataViewName()).toBe(secondTabName);
        await unifiedFieldList.searchField(newFieldName);
        await unifiedFieldList.getAvailableField(newFieldName).waitFor({ state: 'visible' });
      }
    );
  }
});
