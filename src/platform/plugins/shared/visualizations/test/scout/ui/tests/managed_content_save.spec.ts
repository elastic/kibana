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

spaceTest.describe('Visualizations managed content', { tag: '@local-stateful-classic' }, () => {
  let managedId: string;
  let unmanagedId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(KBN_ARCHIVE);
    const getId = (title: string) => {
      const object = imported.find((item) => item.title === title);
      if (!object) throw new Error(`Missing imported saved object: ${title}`);
      return object.id;
    };
    managedId = getId('Managed legacy visualization');
    unmanagedId = getId('Unmanaged legacy visualization');
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'requires a copy when saving a managed visualization',
    async ({ page, pageObjects }) => {
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
    }
  );
});
