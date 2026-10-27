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
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { spaceTest } from '../fixtures';

const NO_TIME_FIELD_OPTION = "--- I don't want to use the time filter ---";

spaceTest.describe(
  'Data view editing — edit flows and field list updates',
  { tag: tags.deploymentAgnostic },
  () => {
    let dataViewId: string;

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      await browserAuth.loginAsAdmin();
      // Reset the data view before each test so edits from one test don't affect the next
      if (dataViewId) {
        await apiServices.dataViews.delete(dataViewId, scoutSpace.id).catch(() => {});
      }
      const { data } = await apiServices.dataViews.create({
        title: 'logstash-*',
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      dataViewId = data.id;
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'editing a data view updates the display name shown in the page header',
      async ({ pageObjects, page }) => {
        await spaceTest.step('navigate to the data view detail page', async () => {
          await pageObjects.dataViewDetail.goto(dataViewId);
        });

        await spaceTest.step('open the editor flyout and rename the data view', async () => {
          await pageObjects.dataViewDetail.openEditFlyout();
          await pageObjects.dataViewEditorFlyout.setTitle('logstash-*');
          await pageObjects.dataViewEditorFlyout.setName('Logstash Star');
          // Renaming only (same pattern) does not trigger the pattern-change confirm modal.
          await pageObjects.dataViewEditorFlyout.save();
        });

        await spaceTest.step('verify the new name appears in the page header', async () => {
          await expect(page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title)).toContainText(
            'Logstash Star'
          );
        });
      }
    );

    spaceTest(
      'can save a named data view again without changing its name',
      async ({ pageObjects, page }) => {
        const header = page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);

        await spaceTest.step('name the data view', async () => {
          await pageObjects.dataViewDetail.goto(dataViewId);
          await pageObjects.dataViewDetail.openEditFlyout();
          await pageObjects.dataViewEditorFlyout.setName('Logstash Star');
          await pageObjects.dataViewEditorFlyout.save();
          await expect(header).toContainText('Logstash Star');
        });

        await spaceTest.step('change the index expression and keep the same name', async () => {
          await pageObjects.dataViewDetail.openEditFlyout();
          await pageObjects.dataViewEditorFlyout.setTitle('logstash-*,hello_world*');
          await pageObjects.dataViewEditorFlyout.save({ withConfirmation: true });
          await expect(header).toContainText('Logstash Star');
        });
      }
    );

    spaceTest(
      'editing updates field list when the index expression is changed',
      async ({ pageObjects, page }) => {
        await spaceTest.step('navigate to data view detail and open edit flyout', async () => {
          await pageObjects.dataViewDetail.goto(dataViewId);
          await pageObjects.dataViewDetail.openEditFlyout();
        });

        await spaceTest.step(
          'change to with-different-timefield index and verify different-timefield field appears',
          async () => {
            await pageObjects.dataViewEditorFlyout.setTitle('with-different-timefield');
            await pageObjects.dataViewEditorFlyout.selectTimestampField('different-timefield');
            await pageObjects.dataViewEditorFlyout.save({ withConfirmation: true });
            await expect(page.testSubj.locator('field-name-different-timefield')).toBeVisible();
          }
        );

        await spaceTest.step(
          'change back to logstash and verify message field appears',
          async () => {
            await pageObjects.dataViewDetail.openEditFlyout();
            await pageObjects.dataViewEditorFlyout.setTitle('logstash-*');
            await pageObjects.dataViewEditorFlyout.selectTimestampField('@timestamp');
            await pageObjects.dataViewEditorFlyout.save({ withConfirmation: true });
            await expect(page.testSubj.locator('field-name-@message')).toBeVisible();
          }
        );
      }
    );

    spaceTest(
      'save button becomes disabled immediately after clicking to prevent double submission',
      async ({ pageObjects }) => {
        const { dataViewEditorFlyout } = pageObjects;

        await spaceTest.step('navigate to data view detail and open edit flyout', async () => {
          await pageObjects.dataViewDetail.goto(dataViewId);
          await pageObjects.dataViewDetail.openEditFlyout();
        });

        await spaceTest.step('update the title and click Save', async () => {
          await dataViewEditorFlyout.setTitle('logs*');
          await dataViewEditorFlyout.selectTimestampField('@timestamp');
          await dataViewEditorFlyout.saveButton.click();
          await expect(dataViewEditorFlyout.confirmButton).toBeVisible();
          await expect(dataViewEditorFlyout.saveButton).toBeDisabled();
          await dataViewEditorFlyout.confirmButton.click();
        });

        await spaceTest.step('verify the flyout closes after confirmation', async () => {
          await expect(dataViewEditorFlyout.flyout).toBeHidden();
        });
      }
    );

    spaceTest(
      'editor is prefilled with previously saved title, index pattern, and time field',
      async ({ pageObjects, page }) => {
        await spaceTest.step('edit data view to set name and timestamp field', async () => {
          await pageObjects.dataViewDetail.goto(dataViewId);
          await pageObjects.dataViewDetail.openEditFlyout();
          await pageObjects.dataViewEditorFlyout.setTitle('logs*');
          await pageObjects.dataViewEditorFlyout.selectTimestampField('utc_time');
          await pageObjects.dataViewEditorFlyout.setName('Logs UTC');
          await pageObjects.dataViewEditorFlyout.save({ withConfirmation: true });
        });

        await spaceTest.step('reopen editor and verify it prefills with saved values', async () => {
          await pageObjects.dataViewDetail.openEditFlyout();

          await expect
            .poll(() => pageObjects.dataViewEditorFlyout.getTimestampFieldValue())
            .toBe('utc_time');
          await expect(pageObjects.dataViewEditorFlyout.nameInput).toHaveValue('Logs UTC');
          await expect(pageObjects.dataViewEditorFlyout.titleInput).toHaveValue('logs*');

          await pageObjects.dataViewEditorFlyout.close();
        });

        await spaceTest.step('verify time field shown on detail page', async () => {
          await expect(page.testSubj.locator('currentIndexPatternTimeField')).toContainText(
            'utc_time'
          );
        });

        await spaceTest.step('save the data view with no time field', async () => {
          await pageObjects.dataViewDetail.openEditFlyout();
          await pageObjects.dataViewEditorFlyout.setTitle('logstash-*');
          await pageObjects.dataViewEditorFlyout.selectTimestampField(NO_TIME_FIELD_OPTION);
          await pageObjects.dataViewEditorFlyout.setName('Just logs');
          await pageObjects.dataViewEditorFlyout.save({ withConfirmation: true });
        });

        await spaceTest.step(
          'reopen the editor and verify no time field is prefilled',
          async () => {
            await pageObjects.dataViewDetail.openEditFlyout();
            await expect
              .poll(() => pageObjects.dataViewEditorFlyout.getTimestampFieldValue())
              .toBe(NO_TIME_FIELD_OPTION);
            await expect(pageObjects.dataViewEditorFlyout.nameInput).toHaveValue('Just logs');
            await expect(pageObjects.dataViewEditorFlyout.titleInput).toHaveValue('logstash-*');
            await pageObjects.dataViewEditorFlyout.close();
            await expect(pageObjects.dataViewDetail.currentTimeField).toBeHidden();
          }
        );
      }
    );
  }
);
