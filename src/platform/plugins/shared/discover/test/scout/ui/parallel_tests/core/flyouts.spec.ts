/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures';

spaceTest.describe('Discover flyouts', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('closes the doc viewer when opening ES|QL docs', async ({ pageObjects }) => {
    const { discover, docViewer } = pageObjects;

    await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
    await expect(docViewer.getFlyout()).toBeVisible();

    await discover.openEsqlQuickReferenceFlyout();

    await expect(docViewer.getFlyout()).toBeHidden();
    await expect(discover.getEsqlQuickReferenceFlyout()).toBeVisible();
  });

  spaceTest('closes the doc viewer when opening the Lens edit flyout', async ({ pageObjects }) => {
    const { discover, docViewer } = pageObjects;

    await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
    await expect(docViewer.getFlyout()).toBeVisible();

    await discover.openLensEditFlyout();

    await expect(docViewer.getFlyout()).toBeHidden();
    await expect(discover.getLensEditFlyout()).toBeVisible();
  });

  spaceTest('closes ES|QL docs when opening the doc viewer', async ({ pageObjects }) => {
    const { discover, docViewer } = pageObjects;

    await discover.openEsqlQuickReferenceFlyout();
    await expect(discover.getEsqlQuickReferenceFlyout()).toBeVisible();

    await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

    await expect(docViewer.getFlyout()).toBeVisible();
    await expect(discover.getEsqlQuickReferenceFlyout()).toBeHidden();
  });

  spaceTest(
    'closes ES|QL docs when opening the Lens edit flyout',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.openEsqlQuickReferenceFlyout();
      await expect(discover.getEsqlQuickReferenceFlyout()).toBeVisible();

      await discover.openLensEditFlyout();

      await expect(discover.getLensEditFlyout()).toBeVisible();
      await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeHidden();
      await expect(discover.getEsqlQuickReferenceFlyout()).toBeHidden();
    }
  );

  spaceTest('closes the Lens edit flyout when opening the doc viewer', async ({ pageObjects }) => {
    const { discover, docViewer } = pageObjects;

    await discover.openLensEditFlyout();
    await expect(discover.getLensEditFlyout()).toBeVisible();

    await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

    await expect(docViewer.getFlyout()).toBeVisible();
    await expect(discover.getLensEditFlyout()).toBeHidden();
  });
});
