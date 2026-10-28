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

spaceTest.describe(
  'Data view field popularity persistence',
  { tag: tags.deploymentAgnostic },
  () => {
    let dataViewId: string;

    spaceTest.beforeEach(async ({ apiServices, browserAuth, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      const { data } = await apiServices.dataViews.create({
        title: 'logstash-*',
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      dataViewId = data.id;
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('saved popularity persists after page reload', async ({ pageObjects, page }) => {
      const fieldName = 'geo.coordinates';

      await spaceTest.step('navigate to data view detail and open field editor', async () => {
        await pageObjects.dataViewDetail.goto(dataViewId);
        await pageObjects.dataViewDetail.openFieldEditorForField(fieldName);
        await pageObjects.dataViewDetail.showFieldEditorAdvancedSettings();
      });

      await spaceTest.step('increase popularity from 0 to 1 and save', async () => {
        expect(await pageObjects.dataViewDetail.getPopularity()).toBe('0');
        await pageObjects.dataViewDetail.setPopularity(1);
        await pageObjects.dataViewDetail.saveFieldEditor();
      });

      await spaceTest.step('reload the page and verify popularity persisted', async () => {
        await page.reload();
        await pageObjects.dataViewDetail.openFieldEditorForField(fieldName);
        await pageObjects.dataViewDetail.showFieldEditorAdvancedSettings();
        const popularity = await pageObjects.dataViewDetail.getPopularity();
        expect(popularity).toBe('1');
        await pageObjects.dataViewDetail.closeFieldEditor();
      });
    });

    spaceTest(
      'changing popularity for one field does not affect another',
      async ({ pageObjects, page }) => {
        await spaceTest.step('navigate to data view detail and open geo.coordinates', async () => {
          await pageObjects.dataViewDetail.goto(dataViewId);
          await pageObjects.dataViewDetail.openFieldEditorForField('geo.coordinates');
          await pageObjects.dataViewDetail.showFieldEditorAdvancedSettings();
        });

        await spaceTest.step('set geo.coordinates popularity to 5 and save', async () => {
          await pageObjects.dataViewDetail.setPopularity(5);
          await pageObjects.dataViewDetail.saveFieldEditor();
        });

        await spaceTest.step('open bytes and set popularity to 7', async () => {
          await pageObjects.dataViewDetail.openFieldEditorForField('bytes');
          await pageObjects.dataViewDetail.showFieldEditorAdvancedSettings();
          expect(await pageObjects.dataViewDetail.getPopularity()).toBe('0');
          await pageObjects.dataViewDetail.setPopularity(7);
          await pageObjects.dataViewDetail.saveFieldEditor();
        });

        await spaceTest.step(
          'reload and verify both popularities persisted independently',
          async () => {
            await page.reload();

            await pageObjects.dataViewDetail.openFieldEditorForField('geo.coordinates');
            await pageObjects.dataViewDetail.showFieldEditorAdvancedSettings();
            expect(await pageObjects.dataViewDetail.getPopularity()).toBe('5');
            await pageObjects.dataViewDetail.closeFieldEditor();

            await pageObjects.dataViewDetail.openFieldEditorForField('bytes');
            await pageObjects.dataViewDetail.showFieldEditorAdvancedSettings();
            expect(await pageObjects.dataViewDetail.getPopularity()).toBe('7');
            await pageObjects.dataViewDetail.closeFieldEditor();
          }
        );
      }
    );
  }
);
