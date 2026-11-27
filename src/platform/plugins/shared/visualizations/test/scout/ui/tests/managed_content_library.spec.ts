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
import { VisualizeLibraryPage } from '../fixtures/visualize_library_page';

const KBN_ARCHIVE = 'src/platform/test/functional/fixtures/kbn_archiver/managed_content';

spaceTest.describe('Managed items in Visualize Library', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(KBN_ARCHIVE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows managed items as read-only', async ({ page }) => {
    const library = new VisualizeLibraryPage(page);
    await library.goto();

    for (const title of ['Managed lens vis', 'Managed legacy visualization', 'Managed map']) {
      await library.openInspector(title);
      await expect(library.nameInput).toHaveAttribute('readonly', '');
      await expect(library.descriptionInput).toHaveAttribute('readonly', '');
      await library.closeInspector();
    }
  });
});
