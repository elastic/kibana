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

// Scripted fields are disabled on serverless.
spaceTest.describe(
  'Data view version conflict — scripted field',
  { tag: '@local-stateful-classic' },
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
      'surfaces a version conflict when saving a scripted field of an outdated data view',
      async ({ apiServices, page, pageObjects, scoutSpace }) => {
        const { scriptedFieldForm } = pageObjects;

        await spaceTest.step('fill in a new scripted field', async () => {
          await scriptedFieldForm.gotoCreate(dataViewId);
          await scriptedFieldForm.fill({
            name: 'versionConflictScript',
            language: 'painless',
            type: 'number',
            popularity: '0',
            script: "doc['bytes'].value",
          });
        });

        await spaceTest.step(
          'update the field formats of the data view behind the UI',
          async () => {
            await apiServices.dataViews.update(dataViewId, {
              fieldFormats: { 'geo.src': { id: 'number' } },
              spaceId: scoutSpace.id,
            });
          }
        );

        await spaceTest.step('set a format, save and verify the conflict is reported', async () => {
          await scriptedFieldForm.selectFormat('url');
          await scriptedFieldForm.save();

          await expect(page.testSubj.locator('globalToastList')).toContainText(
            'Unable to write data view!'
          );
        });
      }
    );
  }
);
