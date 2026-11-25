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

  // Admin: the privileged user has no Data Views management in the Security serverless project
  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('creates, modifies and deletes a runtime field', async ({ pageObjects }) => {
    const { dataViewDetail } = pageObjects;
    const fieldName = 'atest';

    await dataViewDetail.goto(dataViewId);
    const startingCount = await dataViewDetail.getFieldsTabCount();

    await spaceTest.step('create the field and render its preview from real data', async () => {
      await dataViewDetail.openAddFieldFlyout();
      await dataViewDetail.setFieldName(fieldName);
      await dataViewDetail.setFieldType('Keyword');
      await dataViewDetail.setFieldScript("emit('hello world')");
      await expect(dataViewDetail.fieldPreviewItem).not.toHaveCount(0);

      await dataViewDetail.saveFieldEditor();
      await expect.poll(() => dataViewDetail.getFieldsTabCount()).toBe(startingCount + 1);
    });

    await spaceTest.step('change type, script and format behind the change warning', async () => {
      await dataViewDetail.openFieldEditorForField(fieldName);
      await dataViewDetail.setFieldType('Long');
      await dataViewDetail.replaceFieldScript('emit(6);');
      await dataViewDetail.enableFormatAndSelect('bytes');
      await expect(dataViewDetail.changeWarning).toBeVisible();

      await dataViewDetail.saveFieldEditorAndConfirmChange();
    });

    await spaceTest.step('reload the field format from the saved data view', async () => {
      await dataViewDetail.openFieldEditorForField(fieldName);
      await expect(dataViewDetail.formatSelect).toHaveValue('bytes');
      await dataViewDetail.closeFieldEditor();
    });

    await spaceTest.step('delete the field', async () => {
      await dataViewDetail.deleteField(fieldName);
      await expect(dataViewDetail.fieldRow(fieldName)).toBeHidden();
      await expect.poll(() => dataViewDetail.getFieldsTabCount()).toBe(startingCount);
    });
  });

  spaceTest('creates, modifies and deletes a composite runtime field', async ({ pageObjects }) => {
    const { dataViewDetail } = pageObjects;
    // Starting with '@' to sort toward start of field list
    const fieldName = '@composite.test';

    await dataViewDetail.goto(dataViewId);
    const startingCount = await dataViewDetail.getFieldsTabCount();

    await spaceTest.step('create a composite field with one subfield', async () => {
      await dataViewDetail.openAddFieldFlyout();
      await dataViewDetail.setFieldName(fieldName);
      await dataViewDetail.setFieldType('Composite');
      await dataViewDetail.setCompositeScript("emit('a.a','hello world')");
      await expect(dataViewDetail.compositeSubfieldType(0)).toBeVisible();
      await expect(dataViewDetail.fieldPreviewItem).not.toHaveCount(0);

      await dataViewDetail.saveFieldEditor();
      await expect.poll(() => dataViewDetail.getFieldsTabCount()).toBe(startingCount + 1);
    });

    await spaceTest.step('modify the script to emit a second subfield', async () => {
      await dataViewDetail.openFieldEditorForField(fieldName);
      await expect(dataViewDetail.compositeSubfieldType(0)).toBeVisible();
      // Editing before the preview of the saved script has loaded drops the new subfields
      await expect(dataViewDetail.previewField('@composite.test.a.a')).toBeVisible();
      await dataViewDetail.setCompositeScript("emit('a',6);emit('b',10);");
      await expect(dataViewDetail.compositeSubfieldType(1)).toBeVisible();

      await dataViewDetail.saveFieldEditor();
      await expect.poll(() => dataViewDetail.getFieldsTabCount()).toBe(startingCount + 2);
    });

    await spaceTest.step('delete the composite field and its subfields', async () => {
      await dataViewDetail.deleteField(fieldName);
      await expect(dataViewDetail.fieldRow(fieldName)).toBeHidden();
      await expect.poll(() => dataViewDetail.getFieldsTabCount()).toBe(startingCount);
    });
  });
});
