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
    body: {
      title,
      spec: { format: 'hjson', value: '{ data: { values: [{ a: 1 }] }, mark: point }' },
    },
  });
  return data;
};

const getItem = async (kbnClient: KbnClient, spaceId: string, id: string) => {
  const { data } = await kbnClient.request<VegaItemResponse>({
    method: 'GET',
    path: `/s/${spaceId}/api/vega/${id}`,
    headers: { 'elastic-api-version': VEGA_API_VERSION },
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

spaceTest.describe('Vega panels linked to the library', { tag: '@local-stateful-classic' }, () => {
  let counter = 0;
  const getTitle = (name: string) => `Vega panel ${name} ${Date.now()}-${counter++}`;

  spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
    await kbnClient.savedObjects.clean({ types: ['vega'], space: scoutSpace.id });
  });

  spaceTest(
    'adds a library item, unlinks it and saves it back to the library',
    async ({ browserAuth, kbnClient, pageObjects, scoutSpace }) => {
      const title = getTitle('added');
      const newTitle = getTitle('saved');
      await seedItem(kbnClient, scoutSpace.id, title);
      await browserAuth.loginAsPrivilegedUser();

      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.addPanelFromLibrary(title);
      await pageObjects.dashboard.expectLinkedToLibrary(title);

      await pageObjects.dashboard.unlinkFromLibrary(title);
      await pageObjects.dashboard.saveToLibrary(newTitle, title);

      expect(await findItems(kbnClient, scoutSpace.id, newTitle)).toHaveLength(1);
    }
  );

  spaceTest(
    'edits the library item of a linked panel',
    async ({ browserAuth, kbnClient, page, pageObjects, scoutSpace }) => {
      const title = getTitle('edited');
      const item = await seedItem(kbnClient, scoutSpace.id, title);
      await browserAuth.loginAsPrivilegedUser();

      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.addPanelFromLibrary(title);
      await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel', title);

      await expect(page.testSubj.locator('vegaLibraryEditorFlyout')).toBeVisible();
      // A copy couldn't replace the item the panel references.
      await expect(page.testSubj.locator('vegaLibraryEditorSaveButtonMenu')).toBeHidden();

      // The search bar puts its test subject on the query input itself.
      const queryInput = page.testSubj.locator('editorFlyoutSearchBar');
      await queryInput.fill('a:1');
      await queryInput.press('Enter');
      await page.testSubj.click('vegaLibraryEditorSaveButton');

      await expect(page.testSubj.locator('vegaLibraryEditorFlyout')).toBeHidden();
      const { data } = await getItem(kbnClient, scoutSpace.id, item.id);
      expect(data.query).toStrictEqual({ expression: 'a:1', language: 'kql' });
    }
  );
});
