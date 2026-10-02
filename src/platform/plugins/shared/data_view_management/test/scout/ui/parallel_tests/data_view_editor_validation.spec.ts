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

spaceTest.describe('Data view editor — validation', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ scoutSpace, browserAuth }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'resetting the timestamp field works when switching to an index without date fields',
    async ({ pageObjects }) => {
      await spaceTest.step('navigate and open editor flyout', async () => {
        await pageObjects.dataViewsManagement.goto();
        await pageObjects.dataViewsManagement.openCreateWizard();
      });

      await spaceTest.step(
        'set title to log* and verify timestamp auto-detects as timestamp field',
        async () => {
          await pageObjects.dataViewEditorFlyout.setTitle('log*');
          const tsValue = await pageObjects.dataViewEditorFlyout.getTimestampFieldValue();
          expect(tsValue).toBe('@timestamp');
        }
      );

      await spaceTest.step(
        'change title to without-timefield and verify timestamp is cleared',
        async () => {
          await pageObjects.dataViewEditorFlyout.setTitle('without-timefield');
          await expect
            .poll(() => pageObjects.dataViewEditorFlyout.getTimestampFieldValue())
            .toBe('');
        }
      );

      await spaceTest.step('save and verify no time field was persisted', async () => {
        await pageObjects.dataViewEditorFlyout.save();
        await expect(pageObjects.dataViewDetail.container).toBeVisible();
        await expect(pageObjects.dataViewDetail.currentTimeField).toBeHidden();
      });

      await spaceTest.step('clean up', async () => {
        await pageObjects.dataViewDetail.delete();
      });
    }
  );

  spaceTest(
    'displays a form error when saving a pattern with no matching indices and recovers once corrected',
    async ({ pageObjects }) => {
      const { dataViewEditorFlyout } = pageObjects;

      await spaceTest.step('open the create flyout and enter a non-matching pattern', async () => {
        await pageObjects.dataViewsManagement.goto();
        await pageObjects.dataViewsManagement.openCreateWizard();
        await dataViewEditorFlyout.fillTitle('log-fake*');
      });

      await spaceTest.step('click save and verify the title field error', async () => {
        await dataViewEditorFlyout.saveButton.click();
        await expect(dataViewEditorFlyout.titleInput).toHaveAccessibleDescription(
          /must match one or more data streams, indices, or index aliases/
        );
        await expect(dataViewEditorFlyout.flyout).toBeVisible();
      });

      await spaceTest.step('correct the pattern in the same flyout and save', async () => {
        await dataViewEditorFlyout.titleInput.fill('log*');
        // The failed submit can still be pending and complete by itself with the corrected value,
        // otherwise Save becomes enabled again; either way the error must not block saving.
        await expect(async () => {
          if (
            (await dataViewEditorFlyout.flyout.isVisible()) &&
            (await dataViewEditorFlyout.saveButton.isEnabled())
          ) {
            await dataViewEditorFlyout.saveButton.click();
          }
          await expect(dataViewEditorFlyout.flyout).toBeHidden({ timeout: 2_000 });
        }).toPass({ timeout: 30_000 });
        await expect(pageObjects.dataViewDetail.container).toBeVisible();
      });

      await spaceTest.step('clean up', async () => {
        await pageObjects.dataViewDetail.delete();
      });
    }
  );

  spaceTest(
    'requires a new timestamp field when the pattern changes to one without the selected field',
    async ({ pageObjects }) => {
      const { dataViewEditorFlyout } = pageObjects;

      await spaceTest.step('enter log* and verify the timestamp field auto-selects', async () => {
        await pageObjects.dataViewsManagement.goto();
        await pageObjects.dataViewsManagement.openCreateWizard();
        await dataViewEditorFlyout.setTitle('log*');
        expect(await dataViewEditorFlyout.getTimestampFieldValue()).toBe('@timestamp');
      });

      await spaceTest.step(
        'switch to an index whose only date field has a different name',
        async () => {
          await dataViewEditorFlyout.fillTitle('with-different-timefield');
          await expect.poll(() => dataViewEditorFlyout.getTimestampFieldValue()).toBe('');
        }
      );

      await spaceTest.step('click save and verify the timestamp field error', async () => {
        await dataViewEditorFlyout.saveButton.click();
        await expect(
          dataViewEditorFlyout.flyout.getByRole('combobox', { name: 'Timestamp field' })
        ).toHaveAttribute('aria-invalid', 'true');
        await expect(dataViewEditorFlyout.flyout.getByRole('alert')).toContainText(
          'Select a timestamp field.'
        );
        await expect(dataViewEditorFlyout.flyout).toBeVisible();
      });

      await spaceTest.step('close the flyout', async () => {
        await dataViewEditorFlyout.close();
      });
    }
  );
});
