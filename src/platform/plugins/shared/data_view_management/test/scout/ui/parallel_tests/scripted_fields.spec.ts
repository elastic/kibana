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

spaceTest.describe('Data view scripted fields', { tag: '@local-stateful-classic' }, () => {
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

  // Save runs isScriptValid(), which posts to the preview route, so a real painless compile error
  // from Elasticsearch has to surface as `invalidScriptError`.
  spaceTest('does not allow saving of invalid scripts', async ({ pageObjects }) => {
    const { dataViewFieldEditor } = pageObjects;

    await dataViewFieldEditor.gotoCreateScriptedField(dataViewId);
    await dataViewFieldEditor.fillScriptedField({
      name: 'doomedScriptedField',
      language: 'painless',
      type: 'number',
      popularity: '1',
      script: 'i n v a l i d  s c r i p t',
    });
    await dataViewFieldEditor.saveScriptedField();

    await expect(dataViewFieldEditor.invalidScriptError).toBeVisible();
  });

  // Regression for #33251: saving a scripted field serialised its format so that re-opening it
  // crashed the editor (`field.format.params is not a function`).
  spaceTest('creates a scripted field and re-saves it repeatedly', async ({ pageObjects }) => {
    const { dataViewFieldEditor } = pageObjects;
    const fieldName = 'ram_Pain_ui';

    await dataViewFieldEditor.gotoDataView(dataViewId);
    const startingCount = await dataViewFieldEditor.getScriptedFieldsCount();

    await spaceTest.step('create the field through the management form', async () => {
      await dataViewFieldEditor.gotoCreateScriptedField(dataViewId);
      await dataViewFieldEditor.fillScriptedField({
        name: fieldName,
        language: 'painless',
        type: 'number',
        popularity: '100',
        script: `if (doc['machine.ram'].size() == 0) return -1;
          else return doc['machine.ram'].value / (1024 * 1024 * 1024);
        `,
      });
      await dataViewFieldEditor.saveScriptedFieldAndWaitForReturn();

      await dataViewFieldEditor.gotoDataView(dataViewId);
      await expect.poll(() => dataViewFieldEditor.getScriptedFieldsCount()).toBe(startingCount + 1);
    });

    await spaceTest.step('open and save the field three times', async () => {
      for (let i = 0; i < 3; i++) {
        await dataViewFieldEditor.gotoDataView(dataViewId);
        await dataViewFieldEditor.openScriptedFieldsTab();
        await dataViewFieldEditor.openEditScriptedField(fieldName);
        await dataViewFieldEditor.saveScriptedFieldAndWaitForReturn();
      }
    });
  });
});
