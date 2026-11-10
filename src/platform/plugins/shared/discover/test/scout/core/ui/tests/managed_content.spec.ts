/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'src/platform/test/functional/fixtures/kbn_archiver/managed_content';

spaceTest.describe('Discover managed content', { tag: '@local-stateful-classic' }, () => {
  let managedId: string;
  let unmanagedId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(KBN_ARCHIVE);
    const getId = (title: string) => {
      const object = imported.find((item) => item.title === title);
      if (!object) throw new Error(`Missing imported saved object: ${title}`);
      return object.id;
    };
    managedId = getId('Managed saved search');
    unmanagedId = getId('Unmanaged saved search');
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('requires a copy when saving a managed session', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;
    const badge = page.testSubj.locator('managedContentBadge');
    const saveAsNew = page.testSubj.locator('saveAsNewCheckbox');

    await discover.goto({ queryMode: 'classic', savedSearchId: managedId });
    await discover.waitUntilTabIsLoaded();
    await expect(badge).toBeVisible();
    await discover.clickAppMenuItem('discoverSaveButton');
    await expect(discover.saveModal.modal).toBeVisible();
    await expect(saveAsNew).toHaveAttribute('aria-checked', 'true');
    await expect(saveAsNew).toBeDisabled();
    await discover.saveModal.modal.getByRole('button', { name: 'Cancel' }).click();

    await discover.goto({ queryMode: 'classic', savedSearchId: unmanagedId });
    await discover.waitUntilTabIsLoaded();
    await expect(badge).toBeHidden();
    await discover.clickAppMenuItem('discoverSaveButton');
    await expect(discover.saveModal.modal).toBeVisible();
    await expect(saveAsNew).toHaveAttribute('aria-checked', 'false');
    await expect(saveAsNew).toBeEnabled();
  });
});
