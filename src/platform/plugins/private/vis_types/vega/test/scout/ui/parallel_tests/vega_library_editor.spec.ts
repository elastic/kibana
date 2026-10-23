/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient } from '@kbn/scout';
import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const VEGA_API_VERSION = '2023-10-31';

interface VegaItemResponse {
  id: string;
  data: { title: string; query?: { expression: string; language: string } };
}

const seedItem = async (kbnClient: KbnClient, spaceId: string, title: string) => {
  const { data } = await kbnClient.request<VegaItemResponse>({
    method: 'POST',
    path: `/s/${spaceId}/api/vega`,
    headers: { 'elastic-api-version': VEGA_API_VERSION },
    body: { title, spec: { format: 'hjson', value: '{ mark: point }' } },
  });
  return data;
};

const findItems = async (kbnClient: KbnClient, spaceId: string, title: string) => {
  const { data } = await kbnClient.request<{ data: Array<VegaItemResponse['data']> }>({
    method: 'GET',
    path: `/s/${spaceId}/api/vega`,
    headers: { 'elastic-api-version': VEGA_API_VERSION },
    query: { query: `"${title}"` },
  });
  return data.data.filter((item) => item.title === title);
};

spaceTest.describe('Vega library editor', { tag: '@local-stateful-classic' }, () => {
  let counter = 0;
  const getTitle = (name: string) => `Vega library ${name} ${Date.now()}-${counter++}`;

  spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
    await kbnClient.savedObjects.clean({ types: ['vega'], space: scoutSpace.id });
  });

  spaceTest(
    'saves changes to an existing item in place',
    async ({ browserAuth, kbnClient, page, pageObjects, scoutSpace }) => {
      const title = getTitle('edited');
      const item = await seedItem(kbnClient, scoutSpace.id, title);
      await browserAuth.loginAsPrivilegedUser();

      await pageObjects.visualize.goto();
      await pageObjects.visualize.clickSavedVisualization(title);
      await expect(page.testSubj.locator('vegaLibraryEditorFlyout')).toBeVisible();

      // Nothing changed yet, so there is nothing to save.
      await expect(page.testSubj.locator('vegaLibraryEditorSaveButtonPrimary')).toBeDisabled();

      // The search bar puts its test subject on the query input itself.
      const queryInput = page.testSubj.locator('editorFlyoutSearchBar');
      await queryInput.fill('status:active');
      await queryInput.press('Enter');
      await expect(page.testSubj.locator('vegaLibraryEditorSaveButtonPrimary')).toBeEnabled();

      await page.testSubj.click('vegaLibraryEditorSaveButtonPrimary');

      await expect(page.testSubj.locator('vegaLibraryEditorFlyout')).toBeHidden();
      const { data } = await kbnClient.request<VegaItemResponse>({
        method: 'GET',
        path: `/s/${scoutSpace.id}/api/vega/${item.id}`,
        headers: { 'elastic-api-version': VEGA_API_VERSION },
      });
      expect(data.data.title).toBe(title);
      expect(data.data.query).toStrictEqual({ expression: 'status:active', language: 'kql' });
    }
  );

  spaceTest(
    'saves a copy and leaves the original unchanged',
    async ({ browserAuth, kbnClient, page, pageObjects, scoutSpace }) => {
      const title = getTitle('original');
      const copyTitle = getTitle('copy');
      await seedItem(kbnClient, scoutSpace.id, title);
      await browserAuth.loginAsPrivilegedUser();

      await pageObjects.visualize.goto();
      await pageObjects.visualize.clickSavedVisualization(title);
      await expect(page.testSubj.locator('vegaLibraryEditorFlyout')).toBeVisible();

      await page.testSubj.click('vegaLibraryEditorSaveButtonMenu');
      await page.testSubj.click('vegaLibraryEditorSaveAsNewButton');
      await page.testSubj.fill('savedObjectTitle', copyTitle);
      await page.testSubj.click('confirmSaveSavedObjectButton');

      await expect(page.testSubj.locator('vegaLibraryEditorFlyout')).toBeHidden();
      expect(await findItems(kbnClient, scoutSpace.id, copyTitle)).toHaveLength(1);
      expect(await findItems(kbnClient, scoutSpace.id, title)).toHaveLength(1);
    }
  );

  spaceTest(
    'asks before discarding changes',
    async ({ browserAuth, kbnClient, page, pageObjects, scoutSpace }) => {
      const title = getTitle('discard');
      await seedItem(kbnClient, scoutSpace.id, title);
      await browserAuth.loginAsPrivilegedUser();

      await pageObjects.visualize.goto();
      await pageObjects.visualize.clickSavedVisualization(title);
      await expect(page.testSubj.locator('vegaLibraryEditorFlyout')).toBeVisible();

      // The search bar puts its test subject on the query input itself.
      const queryInput = page.testSubj.locator('editorFlyoutSearchBar');
      await queryInput.fill('status:active');
      await queryInput.press('Enter');
      await page.testSubj.click('vegaLibraryEditorCancelButton');

      await expect(page.testSubj.locator('vegaLibraryEditorDiscardModal')).toBeVisible();
      await page.getByRole('button', { name: 'Keep editing' }).click();
      await expect(page.testSubj.locator('vegaLibraryEditorFlyout')).toBeVisible();

      await page.testSubj.click('vegaLibraryEditorCancelButton');
      await page.getByRole('button', { name: 'Discard changes' }).click();
      await expect(page.testSubj.locator('vegaLibraryEditorFlyout')).toBeHidden();
    }
  );

  spaceTest(
    'opens a read only editor that cannot be saved',
    async ({ browserAuth, kbnClient, page, pageObjects, scoutSpace }) => {
      const title = getTitle('read-only');
      await seedItem(kbnClient, scoutSpace.id, title);
      await browserAuth.loginAsViewer();

      await pageObjects.visualize.goto();
      await pageObjects.visualize.clickSavedVisualization(title);

      await expect(page.testSubj.locator('vegaLibraryEditorFlyout')).toBeVisible();
      await expect(page.testSubj.locator('vegaLibraryEditorReadOnlyBadge')).toBeVisible();
      await expect(page.testSubj.locator('vegaLibraryEditorSaveButton')).toBeHidden();
      await expect(page.testSubj.locator('vegaLibraryEditorSaveButtonPrimary')).toBeHidden();
    }
  );
});
