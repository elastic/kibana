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

// A single logstash-* data view saved with `managed: true`.
const KBN_ARCHIVE_MANAGED_DATA_VIEW =
  'src/platform/test/functional/fixtures/kbn_archiver/managed_data_view';

spaceTest.describe('Managed data view', { tag: tags.deploymentAgnostic }, () => {
  let dataViewId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(KBN_ARCHIVE_MANAGED_DATA_VIEW);
    const dataView = imported.find(({ type }) => type === 'index-pattern');
    if (!dataView) {
      throw new Error(`No data view found in ${KBN_ARCHIVE_MANAGED_DATA_VIEW}`);
    }
    dataViewId = dataView.id;
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows the managed badge on the data view page', async ({ page, pageObjects }) => {
    await pageObjects.dataViewDetail.goto(dataViewId);

    await expect(page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title)).toHaveText('logstash-*');
    await expect(pageObjects.dataViewDetail.managedTag).toHaveText('Managed');
  });

  spaceTest('disables the data view editor', async ({ pageObjects }) => {
    const { dataViewDetail, dataViewEditorFlyout } = pageObjects;

    await dataViewDetail.goto(dataViewId);
    await dataViewDetail.openEditFlyout();

    await expect(dataViewEditorFlyout.nameInput).toBeDisabled();
    await expect(dataViewEditorFlyout.titleInput).toBeDisabled();
  });

  spaceTest('disables the field editor', async ({ pageObjects }) => {
    const { dataViewDetail } = pageObjects;

    await dataViewDetail.goto(dataViewId);
    await dataViewDetail.openAddFieldFlyout();

    await expect(dataViewDetail.fieldEditorNameInput).toBeDisabled();
    await expect(dataViewDetail.fieldEditorTypeInput).toBeDisabled();
  });

  spaceTest('does not offer deletion on the data view page', async ({ pageObjects }) => {
    const { dataViewDetail } = pageObjects;

    await dataViewDetail.goto(dataViewId);
    await dataViewDetail.revealAllHeaderActions();

    await expect(dataViewDetail.deleteButton).toBeHidden();
  });

  spaceTest('disables the delete action on the list page', async ({ pageObjects }) => {
    const { dataViewsManagement } = pageObjects;

    await dataViewsManagement.goto();
    await dataViewsManagement.waitForTableLoaded();

    // Row icon actions expose disabled state with `aria-disabled="true"` (because
    // `hasAriaDisabled` keeps the button focusable for its tooltip) instead of `disabled`.
    await expect(
      dataViewsManagement.table
        .getByRole('row')
        .filter({ hasText: 'logstash-*' })
        .getByTestId('action-delete')
    ).toHaveAttribute('aria-disabled', 'true');
  });
});
