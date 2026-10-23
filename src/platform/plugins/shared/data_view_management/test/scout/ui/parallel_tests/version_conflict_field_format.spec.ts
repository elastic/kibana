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
  'Data view version conflict — field format',
  { tag: tags.deploymentAgnostic },
  () => {
    let dataViewId: string;

    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      const { data } = await apiServices.dataViews.create({
        title: 'logstash-*',
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      dataViewId = data.id;
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
      await apiServices.dataViews.delete(dataViewId, scoutSpace.id);
    });

    spaceTest(
      'surfaces a version conflict when saving a field format of an outdated data view',
      async ({ apiServices, page, pageObjects, scoutSpace }) => {
        const { dataViewDetail } = pageObjects;

        await spaceTest.step('change the format of a field in the editor', async () => {
          await dataViewDetail.goto(dataViewId);
          await dataViewDetail.openFieldEditorForField('geo.srcdest');
          await dataViewDetail.enableFormatAndSelect('url');
        });

        await spaceTest.step(
          'update the field formats of the data view behind the UI',
          async () => {
            await apiServices.dataViews.update(dataViewId, {
              fieldFormats: { 'geo.dest': { id: 'number' } },
              spaceId: scoutSpace.id,
            });
          }
        );

        await spaceTest.step('save and verify the conflict is reported', async () => {
          await dataViewDetail.fieldEditorSaveButton.click();

          await expect(page.testSubj.locator('globalToastList')).toContainText(
            'Unable to write data view!'
          );
        });
      }
    );
  }
);
