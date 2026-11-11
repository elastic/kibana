/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esArchiverFixture, findImportedSavedObjectId, mergeTests, spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'src/platform/test/functional/fixtures/kbn_archiver/managed_content';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const test = mergeTests(spaceTest, esArchiverFixture);

test.describe('Visualizations managed content', { tag: '@local-stateful-classic' }, () => {
  let managedId: string;
  let unmanagedId: string;

  test.beforeAll(async ({ esArchiver, scoutSpace }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    const imported = await scoutSpace.savedObjects.load(KBN_ARCHIVE);
    managedId = findImportedSavedObjectId(
      imported,
      'visualization',
      'Managed legacy visualization'
    );
    unmanagedId = findImportedSavedObjectId(
      imported,
      'visualization',
      'Unmanaged legacy visualization'
    );
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  test('requires a copy when saving a managed visualization', async ({ page, pageObjects }) => {
    const { visualize } = pageObjects;
    const badge = page.testSubj.locator('managedContentBadge');
    const saveAsNew = page.testSubj.locator('saveAsNewCheckbox');

    await page.gotoApp('visualize', {
      hash: `/edit/${managedId}`,
      readyWhen: page.testSubj.locator('visualizationLoader'),
    });
    await visualize.waitForVisualizationLoaded();
    await expect(badge).toBeVisible();
    await visualize.openSaveModal();
    await expect(saveAsNew).toHaveAttribute('aria-checked', 'true');
    await expect(saveAsNew).toBeDisabled();
    await visualize.saveModal.modal.getByRole('button', { name: 'Cancel' }).click();

    await page.gotoApp('visualize', {
      hash: `/edit/${unmanagedId}`,
      readyWhen: page.testSubj.locator('visualizationLoader'),
    });
    await visualize.waitForVisualizationLoaded();
    await expect(badge).toBeHidden();
    await visualize.openSaveModal();
    await expect(saveAsNew).toHaveAttribute('aria-checked', 'false');
    await expect(saveAsNew).toBeEnabled();
  });
});
