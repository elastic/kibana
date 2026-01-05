/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover, unifiedTabs, unifiedSearch, unifiedFieldList } = getPageObjects([
    'discover',
    'unifiedTabs',
    'unifiedSearch',
    'unifiedFieldList',
  ]);
  const dataViews = getService('dataViews');
  const fieldEditor = getService('fieldEditor');
  const retry = getService('retry');

  const getAvailableDataViews = async () => {
    return await unifiedSearch.getDataViewList('discover-dataView-switch-link');
  };

  const checkFieldIsInSidebar = async (fieldName: string, isVisible: boolean) => {
    await unifiedFieldList.waitUntilSidebarHasLoaded();
    await retry.try(async () => {
      if (isVisible) {
        expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).to.contain(
          fieldName
        );
      } else {
        expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).not.to.contain(
          fieldName
        );
      }
    });
  };

  const createRuntimeField = async (fieldName: string) => {
    await discover.addRuntimeField(fieldName, `emit((doc["bytes"].value * 2).toString())`);
    await discover.waitUntilTabIsLoaded();
    await unifiedFieldList.waitUntilSidebarHasLoaded();
  };

  const editRuntimeField = async (oldName: string, newName: string) => {
    await discover.editField(oldName);
    await fieldEditor.setName(newName);
    await fieldEditor.save();
    await fieldEditor.confirmSave();
    await fieldEditor.waitUntilClosed();
    await discover.waitUntilTabIsLoaded();
    await unifiedFieldList.waitUntilSidebarHasLoaded();
  };

  describe('tab data view editing', function () {
    [true, false].forEach((isAdHocDataView) => {
      describe(isAdHocDataView ? 'ad-hoc data view' : 'persisted data view', () => {
        it('can edit data view name', async () => {
          if (isAdHocDataView) {
            await dataViews.createFromSearchBar({
              name: 'logstash',
              hasTimeField: true,
              adHoc: true,
            });
            await discover.waitUntilTabIsLoaded();
          }

          const prevName = await dataViews.getSelectedName();
          const editedName = 'logstash_edited_name';

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          expect(await dataViews.getSelectedName()).to.be(prevName);

          await dataViews.editFromSearchBar({
            newName: editedName,
            newTimeField: '@timestamp',
          });
          await discover.waitUntilTabIsLoaded();
          expect(await dataViews.getSelectedName()).to.be(editedName);

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          expect(await dataViews.getSelectedName()).to.be(editedName);

          const availableDataViews = await getAvailableDataViews();

          expect(availableDataViews).not.to.contain(prevName);
          expect(availableDataViews).to.contain(editedName);
        });

        it('can create runtime fields for the same data view in both tabs', async () => {
          if (isAdHocDataView) {
            await dataViews.createFromSearchBar({
              name: 'logst',
              hasTimeField: true,
              adHoc: true,
            });
            await discover.waitUntilTabIsLoaded();
          }
          const currentName = await dataViews.getSelectedName();

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          expect(await dataViews.getSelectedName()).to.be(currentName);

          // creating a runtime field in the second tab
          const newFieldName = '_test_new_field';
          await createRuntimeField(newFieldName);
          await checkFieldIsInSidebar(newFieldName, true);

          let availableDataViews = await getAvailableDataViews();
          expect(availableDataViews.filter((name) => name === currentName).length).to.be(
            isAdHocDataView ? 2 : 1
          );

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          expect(await dataViews.getSelectedName()).to.be(currentName);
          await checkFieldIsInSidebar(newFieldName, !isAdHocDataView);

          await unifiedTabs.selectTab(1);
          await discover.waitUntilTabIsLoaded();
          expect(await dataViews.getSelectedName()).to.be(currentName);
          await checkFieldIsInSidebar(newFieldName, true);

          // editing the runtime field in the second tab
          const editedFieldName = '_test_new_field_edited';
          await editRuntimeField(newFieldName, editedFieldName);
          await checkFieldIsInSidebar(editedFieldName, true);
          await checkFieldIsInSidebar(newFieldName, false);

          availableDataViews = await getAvailableDataViews();
          expect(availableDataViews.filter((name) => name === currentName).length).to.be(
            isAdHocDataView ? 2 : 1
          );

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          expect(await dataViews.getSelectedName()).to.be(currentName);
          if (isAdHocDataView) {
            await checkFieldIsInSidebar(editedFieldName, false);
            await checkFieldIsInSidebar(newFieldName, false);
          } else {
            await checkFieldIsInSidebar(editedFieldName, true);
            await checkFieldIsInSidebar(newFieldName, false);
          }
        });

        it('can create runtime fields for a different data view', async () => {
          const firstTabName = await dataViews.getSelectedName();

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();

          if (isAdHocDataView) {
            await dataViews.createFromSearchBar({
              name: 'logs',
              hasTimeField: true,
              adHoc: true,
            });
          } else {
            await dataViews.createFromSearchBar({
              name: 'log',
              hasTimeField: true,
              adHoc: false,
            });
          }
          await discover.waitUntilTabIsLoaded();
          const secondTabName = await dataViews.getSelectedName();

          const newFieldName = '_test_new_field2';
          await createRuntimeField(newFieldName);
          await checkFieldIsInSidebar(newFieldName, true);

          const availableDataViews = await getAvailableDataViews();
          expect(availableDataViews.filter((name) => name === firstTabName).length).to.be(1);
          expect(availableDataViews.filter((name) => name === secondTabName).length).to.be(1);

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          expect(await dataViews.getSelectedName()).to.be(firstTabName);
          await checkFieldIsInSidebar(newFieldName, false);

          await unifiedTabs.selectTab(1);
          await discover.waitUntilTabIsLoaded();
          expect(await dataViews.getSelectedName()).to.be(secondTabName);
          await checkFieldIsInSidebar(newFieldName, true);
        });
      });
    });
  });
}
