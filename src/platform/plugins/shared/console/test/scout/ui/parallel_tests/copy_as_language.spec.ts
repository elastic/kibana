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
import { spaceTest } from '../fixtures';

spaceTest.describe('Console copy as language', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await browserAuth.loginAsAdmin();
    // The default language is persisted per browser context, so every test starts from curl.
    await pageObjects.console.gotoWithRequestLoaded('GET _search');
    await pageObjects.console.skipTourIfExists();
  });

  spaceTest('copies the request as curl by default', async ({ page, pageObjects }) => {
    await pageObjects.console.openContextMenu();
    await pageObjects.console.copyAsMenuItem.click();

    await pageObjects.toasts.waitFor();
    expect(await pageObjects.toasts.getHeaderText()).toBe('Request copied to clipboard as curl');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('curl -X GET');
  });

  spaceTest(
    'copies a selection containing a kbn request as curl only',
    async ({ page, pageObjects }) => {
      await pageObjects.console.clearEditorText();
      await pageObjects.console.enterText('GET _search\nGET kbn:/api/spaces/space');
      await pageObjects.console.selectAllRequests();

      await spaceTest.step('the copy falls back to curl for both requests', async () => {
        await pageObjects.console.openContextMenu();
        await pageObjects.console.copyAsMenuItem.click();

        await pageObjects.toasts.waitFor();
        expect(await pageObjects.toasts.getHeaderText()).toBe(
          'Requests copied to clipboard as curl'
        );
        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).toContain('curl -X GET');
      });

      await spaceTest.step('no other language can be selected', async () => {
        await pageObjects.console.selectAllRequests();
        await pageObjects.console.openContextMenu();
        await expect(pageObjects.console.selectLanguageMenuItem).toBeHidden();
      });
    }
  );

  spaceTest(
    'copies the request in a language picked from the selector',
    async ({ page, pageObjects }) => {
      await pageObjects.console.openContextMenu();
      await pageObjects.console.openLanguageSelector();
      await pageObjects.console.pickLanguage('javascript');
      await pageObjects.console.copyAsLanguageSubmitButton.click();

      await pageObjects.toasts.waitFor();
      expect(await pageObjects.toasts.getHeaderText()).toBe(
        'Request copied to clipboard as JavaScript'
      );

      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('require("@elastic/elasticsearch")');
    }
  );

  spaceTest('changes the default language from the selector', async ({ pageObjects }) => {
    await pageObjects.console.openContextMenu();
    await expect(pageObjects.console.copyAsMenuItem).toContainText('curl', { ignoreCase: true });

    await pageObjects.console.openLanguageSelector();
    await pageObjects.console.pickLanguage('python');
    await pageObjects.console.setAsDefaultLanguageButton.click();
    // Closing the modal without copying still saves the new default.
    await pageObjects.console.closeCopyAsModalButton.click();

    await expect(pageObjects.console.copyAsMenuItem).toContainText('Python');
  });

  spaceTest('keeps the new default language after copying the code', async ({ pageObjects }) => {
    await pageObjects.console.openContextMenu();
    await pageObjects.console.openLanguageSelector();
    await pageObjects.console.pickLanguage('php');
    await pageObjects.console.setAsDefaultLanguageButton.click();
    await pageObjects.console.copyAsLanguageSubmitButton.click();
    await expect(pageObjects.console.closeCopyAsModalButton).toBeHidden();

    await pageObjects.console.selectAllRequests();
    await pageObjects.console.openContextMenu();

    await expect(pageObjects.console.copyAsMenuItem).toContainText('PHP');
  });
});
