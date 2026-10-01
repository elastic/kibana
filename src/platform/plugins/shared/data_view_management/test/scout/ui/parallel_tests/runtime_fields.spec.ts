/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe('Data view runtime fields', { tag: tags.deploymentAgnostic }, () => {
  let dataViewId: string;

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    const { data } = await apiServices.dataViews.create({
      title: 'logstash-*',
      override: true,
      spaceId: scoutSpace.id,
    });
    dataViewId = data.id;
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('creates, modifies and deletes a runtime field', async ({ pageObjects }) => {
    const { dataViewFieldEditor } = pageObjects;
    const fieldName = 'atest';

    await dataViewFieldEditor.gotoDataView(dataViewId);
    const startingCount = await dataViewFieldEditor.getFieldsCount();

    await spaceTest.step('create the field and render its preview from real data', async () => {
      await dataViewFieldEditor.openAddFieldFlyout();
      await dataViewFieldEditor.setFieldName(fieldName);
      await dataViewFieldEditor.setFieldType('Keyword');
      await dataViewFieldEditor.setFieldScript("emit('hello world')");
      await expect(dataViewFieldEditor.fieldPreviewItem).not.toHaveCount(0);

      await dataViewFieldEditor.saveAndWaitForClose();
      await expect.poll(() => dataViewFieldEditor.getFieldsCount()).toBe(startingCount + 1);
    });

    await spaceTest.step('change type, script and format behind the change warning', async () => {
      await dataViewFieldEditor.filterFields(fieldName);
      await dataViewFieldEditor.openEditFieldFlyout(fieldName);
      await dataViewFieldEditor.setFieldType('Long');
      await dataViewFieldEditor.replaceFieldScript('emit(6);');
      await dataViewFieldEditor.enableFormatAndSelect('bytes');
      await expect(dataViewFieldEditor.changeWarning).toBeVisible();

      await dataViewFieldEditor.saveAndConfirmChange();
    });

    await spaceTest.step('reload the field format from the saved data view', async () => {
      await dataViewFieldEditor.openEditFieldFlyout(fieldName);
      await expect(dataViewFieldEditor.formatSelect).toHaveValue('bytes');
      await dataViewFieldEditor.closeFlyout();
    });

    await spaceTest.step('delete the field', async () => {
      await dataViewFieldEditor.deleteField(fieldName);
      await expect(dataViewFieldEditor.fieldRow(fieldName)).toBeHidden();
      await expect.poll(() => dataViewFieldEditor.getFieldsCount()).toBe(startingCount);
    });
  });

  spaceTest('creates, modifies and deletes a composite runtime field', async ({ pageObjects }) => {
    const { dataViewFieldEditor } = pageObjects;
    // Starting with '@' to sort toward start of field list
    const fieldName = '@composite.test';

    await dataViewFieldEditor.gotoDataView(dataViewId);
    const startingCount = await dataViewFieldEditor.getFieldsCount();

    await spaceTest.step('create a composite field with one subfield', async () => {
      await dataViewFieldEditor.openAddFieldFlyout();
      await dataViewFieldEditor.setFieldName(fieldName);
      await dataViewFieldEditor.setFieldType('Composite');
      await dataViewFieldEditor.setCompositeScript("emit('a.a','hello world')");
      await expect(dataViewFieldEditor.compositeSubfieldType(0)).toBeVisible();
      await expect(dataViewFieldEditor.fieldPreviewItem).not.toHaveCount(0);

      await dataViewFieldEditor.saveAndWaitForClose();
      await expect.poll(() => dataViewFieldEditor.getFieldsCount()).toBe(startingCount + 1);
    });

    await spaceTest.step('modify the script to emit a second subfield', async () => {
      await dataViewFieldEditor.filterFields(fieldName);
      await dataViewFieldEditor.openEditFieldFlyout(fieldName);
      await expect(dataViewFieldEditor.compositeSubfieldType(0)).toBeVisible();
      // Editing before the preview of the saved script has loaded drops the new subfields
      await expect(dataViewFieldEditor.previewField('@composite.test.a.a')).toBeVisible();
      await dataViewFieldEditor.setCompositeScript("emit('a',6);emit('b',10);");
      await expect(dataViewFieldEditor.compositeSubfieldType(1)).toBeVisible();

      await dataViewFieldEditor.saveAndWaitForClose();
      await expect.poll(() => dataViewFieldEditor.getFieldsCount()).toBe(startingCount + 2);
    });

    await spaceTest.step('delete the composite field and its subfields', async () => {
      await dataViewFieldEditor.deleteField(fieldName);
      await expect(dataViewFieldEditor.fieldRow(fieldName)).toBeHidden();
      await expect.poll(() => dataViewFieldEditor.getFieldsCount()).toBe(startingCount);
    });
  });
});
