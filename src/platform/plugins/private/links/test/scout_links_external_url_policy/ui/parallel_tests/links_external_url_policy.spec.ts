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
import { spaceTest } from '../../../scout/ui/fixtures';
import { DASHBOARD_KBN_ARCHIVE } from '../../../scout/ui/constants';

spaceTest.describe('Links panel - external URL policy', { tag: tags.stateful.classic }, () => {
  let externalLinksDashboardId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(DASHBOARD_KBN_ARCHIVE);
    externalLinksDashboardId = imported.find(
      ({ type, title }) => type === 'dashboard' && title === 'dashboard with external links'
    )!.id;
  });

  spaceTest.beforeEach(async ({ browserAuth, context }) => {
    await browserAuth.loginAsPrivilegedUser();
    // Navigation to example.com is only asserted on, so don't depend on external network access.
    await context.route('https://example.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<html><body>example</body></html>' })
    );
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'can not add an external link that violates externalLinks.policy',
    async ({ page, pageObjects }) => {
      const { dashboard, linksPanel } = pageObjects;

      await dashboard.openNewDashboard();
      await dashboard.openAddPanelFlyout();
      await linksPanel.openEditorFromAddPanelFlyout();

      await linksPanel.setExternalUrl('https://danger.example.com');
      await expect(linksPanel.linkDestinationError).toBeVisible();
      await expect(page.testSubj.locator('links--linkEditor--saveBtn')).toBeDisabled();
    }
  );

  spaceTest(
    'should disable link if forbidden by external url policy',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(externalLinksDashboardId);

      await expect(
        page.testSubj.locator('externalLink--external link violation--error')
      ).toBeDisabled();
    }
  );

  spaceTest(
    'should create an external link when openInNewTab is enabled',
    async ({ context, page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(externalLinksDashboardId);

      const [newTab] = await Promise.all([
        context.waitForEvent('page'),
        page.testSubj.click('externalLink--opens in new tab'),
      ]);

      await expect(newTab).toHaveURL('https://example.com/1');
    }
  );

  spaceTest(
    'should open in same tab when openInNewTab is disabled',
    async ({ context, page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(externalLinksDashboardId);

      await page.testSubj.click('externalLink--opens in same tab');

      await expect(page).toHaveURL('https://example.com/2');
      expect(context.pages()).toHaveLength(1);
    }
  );
});
