/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", or the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, type DiscoverPageObjects } from '../fixtures';

const openDocViewerFieldDescription = async ({
  page,
  pageObjects,
  field,
}: {
  page: ScoutPage;
  pageObjects: DiscoverPageObjects;
  field: string;
}) => {
  await pageObjects.docViewer.openAndWaitForFlyout({ rowIndex: 0 });
  await pageObjects.docViewer.openTab('doc_view_table');
  const flyout = page.testSubj.locator('docViewerFlyout');
  const fieldNameCell = flyout.locator(`[data-test-subj="tableDocViewRow-${field}-name"]`);
  const expandButton = flyout.getByTestId('euiDataGridCellExpandButton');

  await fieldNameCell.waitFor({ state: 'visible' });
  await fieldNameCell.scrollIntoViewIfNeeded();
  await fieldNameCell.click();
  await expandButton.click();
  await page.testSubj.locator(`fieldDescription-${field}`).waitFor({ state: 'visible' });
};

spaceTest.describe(
  'Discover runtime field editor metadata',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, discoverScoutSpace, pageObjects }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterEach(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('adds a custom label to an existing field', async ({ page, pageObjects }) => {
      const { dataGrid, discover, unifiedFieldList } = pageObjects;
      const customLabel = 'megabytes';

      await unifiedFieldList.openFieldEditor('bytes');
      await discover.setCustomLabel(customLabel);
      await discover.saveOpenFieldEditor();

      await unifiedFieldList.searchField(customLabel);
      const customLabelField = page.testSubj
        .locator('fieldListGroupedAvailableFields')
        .locator('li')
        .filter({ hasText: customLabel });
      await expect(
        customLabelField.getByRole('button', { name: customLabel, exact: true })
      ).toBeVisible();

      await customLabelField.getByRole('button', { name: 'Add field as column' }).click();
      expect(await dataGrid.getDataGridHeaderFieldTokens()).toContain(customLabel);
    });

    spaceTest(
      'adds and updates a custom description for an existing field',
      async ({ page, pageObjects }) => {
        const { discover, docViewer, unifiedFieldList } = pageObjects;
        const customDescription = 'custom agent description here';
        const updatedCustomDescription = `${customDescription} updated`;

        await unifiedFieldList.openFieldEditor('agent');
        await discover.setCustomDescription(customDescription);
        await discover.saveOpenFieldEditor();

        await unifiedFieldList.clickFieldListItem('agent');
        await expect(unifiedFieldList.getFieldDescription('agent')).toHaveText(customDescription);
        await unifiedFieldList.closeFieldPopover();

        await unifiedFieldList.openFieldEditor('agent');
        await discover.setCustomDescription(updatedCustomDescription);
        await discover.saveOpenFieldEditor();

        await unifiedFieldList.clickFieldListItem('agent');
        await expect(unifiedFieldList.getFieldDescription('agent')).toHaveText(
          updatedCustomDescription
        );
        await unifiedFieldList.closeFieldPopover();

        await openDocViewerFieldDescription({ page, pageObjects, field: 'agent' });
        await expect(unifiedFieldList.getFieldDescription('agent')).toHaveText(
          updatedCustomDescription
        );
        await docViewer.close();
      }
    );

    spaceTest(
      'replaces the ECS description for the timestamp field',
      async ({ page, pageObjects }) => {
        const { discover, docViewer, unifiedFieldList } = pageObjects;
        const customDescription = 'custom timestamp description here';

        await unifiedFieldList.clickFieldListItem('@timestamp');
        await expect(unifiedFieldList.getFieldDescription('@timestamp')).toContainText('Date');
        await unifiedFieldList.closeFieldPopover();

        await openDocViewerFieldDescription({ page, pageObjects, field: '@timestamp' });
        await expect(unifiedFieldList.getFieldDescription('@timestamp')).toContainText('Date');
        await docViewer.close();

        await unifiedFieldList.openFieldEditor('@timestamp');
        await discover.setCustomDescription(customDescription);
        await discover.saveOpenFieldEditor();

        await unifiedFieldList.clickFieldListItem('@timestamp');
        await expect(unifiedFieldList.getFieldDescription('@timestamp')).toHaveText(
          customDescription
        );
        await unifiedFieldList.closeFieldPopover();

        await openDocViewerFieldDescription({ page, pageObjects, field: '@timestamp' });
        await expect(unifiedFieldList.getFieldDescription('@timestamp')).toHaveText(
          customDescription
        );
        await docViewer.close();
      }
    );

    spaceTest(
      'shows a validation error when a custom description is too long',
      async ({ pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;
        const customDescription = 'custom bytes long description here'.repeat(10);

        await unifiedFieldList.openFieldEditor('bytes');
        await discover.setCustomDescription(customDescription);
        await discover.getFieldEditorFormError().waitFor({ state: 'visible' });
        await expect(discover.getFieldEditorFormError()).toContainText(
          'The length of the description is too long. The maximum length is 300 characters.'
        );
        await discover.discardOpenFieldEditorChanges();
      }
    );
  }
);
