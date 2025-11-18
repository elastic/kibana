/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const toasts = getService('toasts');

  describe('console context menu', function testContextMenu() {
    before(async () => {
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.skipTourIfExists();
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText('GET _search');
    });

    it('should open context menu', async () => {
      expect(await PageObjects.console.isContextMenuOpen()).to.be(false);
      await PageObjects.console.clickContextMenu();
      expect(PageObjects.console.isContextMenuOpen()).to.be.eql(true);
    });

    it('should have options to copy to language, language clients, open documentation, and auto indent', async () => {
      await PageObjects.console.clickContextMenu();
      expect(PageObjects.console.isContextMenuOpen()).to.be.eql(true);
      expect(PageObjects.console.isCopyToLanguageButtonVisible()).to.be.eql(true);
      expect(PageObjects.console.isLanguageClientsButtonVisible()).to.be.eql(true);
      expect(PageObjects.console.isOpenDocumentationButtonVisible()).to.be.eql(true);
      expect(PageObjects.console.isAutoIndentButtonVisible()).to.be.eql(true);
    });

    describe('Copy as', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('console');
        await PageObjects.console.skipTourIfExists();
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText('GET _search');
      });

      it('by default it should copy as curl and show toast when copy to language button is clicked', async () => {
        await PageObjects.console.clickContextMenu();
        await PageObjects.console.clickCopyToLanguageButton();

        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();

        if (toastText.includes('Write permission denied')) {
          log.debug('Write permission denied, skipping test');
          return;
        }

        expect(toastText).to.be('Request copied to clipboard as curl');

        const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
        if (canReadClipboard) {
          const clipboardText = await browser.getClipboardValue();
          expect(clipboardText).to.contain('curl -X GET');
        }
      });

      it('doesnt allow to copy kbn requests as anything other than curl', async () => {
        const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');

        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText('GET _search\n');

        // Add a kbn request
        // pressEnter
        await PageObjects.console.enterText('GET kbn:/api/spaces/space');
        // Make sure to select the es and kbn request
        await PageObjects.console.selectAllRequests();

        await PageObjects.console.clickContextMenu();
        await PageObjects.console.clickCopyToLanguageButton();

        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();

        expect(toastText).to.be('Requests copied to clipboard as curl');

        // Check if the clipboard has the curl request
        if (canReadClipboard) {
          const clipboardText = await browser.getClipboardValue();
          expect(clipboardText).to.contain('curl -X GET');
        }

        // Wait until async operation is done
        await PageObjects.common.sleep(1000);

        // Focus editor once again
        await PageObjects.console.focusInputEditor();

        // Verify that the Language clients button is hidden for kbn request
        await PageObjects.console.clickContextMenu();
        const languageClientsVisible = await PageObjects.console.isLanguageClientsButtonVisible();
        expect(languageClientsVisible).to.be(false);
      });

      it('allows to change default language', async () => {
        await PageObjects.console.clickContextMenu();

        // Wait for menu to be fully open
        await retry.waitFor('context menu to open', async () => {
          return await testSubjects.exists('consoleMenuCopyToLanguage');
        });

        // Check default language shows "Copy to curl"
        let copyMenuItem = await testSubjects.find('consoleMenuCopyToLanguage');
        let menuItemText = await copyMenuItem.getVisibleText();
        expect(menuItemText.toLowerCase()).to.contain('copy to curl');

        // Change default language to Python
        await PageObjects.console.changeDefaultLanguage('python');

        // Wait for panel to return to main menu
        await retry.waitFor('panel to return to main menu', async () => {
          return await testSubjects.exists('consoleMenuCopyToLanguage');
        });

        // Wait for panel animation to complete
        await PageObjects.common.sleep(300);

        // Check that the menu item now shows "Copy to Python"
        copyMenuItem = await testSubjects.find('consoleMenuCopyToLanguage');
        menuItemText = await copyMenuItem.getVisibleText();
        expect(menuItemText).to.contain('Copy to Python');
      });

      it('allows to select a different language to copy as and should copy it right away to clipboard', async () => {
        await PageObjects.console.clickContextMenu();
        await PageObjects.console.changeLanguageAndCopy('javascript');

        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();

        if (toastText.includes('Write permission denied')) {
          log.debug('Write permission denied, skipping test');
          return;
        }

        expect(toastText).to.be('Request copied to clipboard as JavaScript');

        const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
        if (canReadClipboard) {
          const clipboardText = await browser.getClipboardValue();
          expect(clipboardText).to.contain('require("@elastic/elasticsearch")');
        }
      });
    });

    it('should open documentation when open documentation button is clicked', async () => {
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText('GET _search');
      await PageObjects.console.clickContextMenu();
      await PageObjects.console.clickOpenDocumentationButton();

      await retry.tryForTime(10000, async () => {
        await browser.switchTab(1);
      });

      // Retry until the documentation is loaded
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        // The url that is open is https://www.elastic.co/guide/en/elasticsearch/reference/master/search-search.html
        // but in v9.0+ it redirects to https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
        expect(url).to.contain('operation-search');
      });

      // Close the documentation tab
      await browser.closeCurrentWindow();
      await browser.switchTab(0);
    });

    it('should auto indent when auto indent button is clicked', async () => {
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText('GET _search\n{"query": {"match_all": {}}}');
      await PageObjects.console.clickContextMenu();
      await PageObjects.console.clickAutoIndentButton();
      // Retry until the request is auto indented
      await retry.try(async () => {
        const request = await PageObjects.console.getEditorText();
        expect(request).to.be.eql('GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}');
      });
    });

    it('should display keyboard shortcut badges for Auto indent and API reference', async () => {
      await PageObjects.console.clickContextMenu();

      // Check Auto indent shortcut badge exists
      const autoIndentShortcutExists = await testSubjects.exists('consoleMenuAutoIndentShortcut');
      expect(autoIndentShortcutExists).to.be(true);

      // Get Auto indent shortcut badge text
      const autoIndentShortcut = await testSubjects.find('consoleMenuAutoIndentShortcut');
      const autoIndentShortcutText = await autoIndentShortcut.getVisibleText();

      // Check it shows either Cmd+I (Mac) or Ctrl+I (Windows/Linux)
      expect(autoIndentShortcutText).to.match(/^(⌘|Ctrl) \+ I$/);

      // Check API reference shortcut badge exists
      const openDocsShortcutExists = await testSubjects.exists('consoleMenuOpenDocsShortcut');
      expect(openDocsShortcutExists).to.be(true);

      // Get API reference shortcut badge text
      const openDocsShortcut = await testSubjects.find('consoleMenuOpenDocsShortcut');
      const openDocsShortcutText = await openDocsShortcut.getVisibleText();

      // Check it shows either Cmd+/ (Mac) or Ctrl+/ (Windows/Linux)
      expect(openDocsShortcutText).to.match(/^(⌘|Ctrl) \+ \/$/);
    });
  });
}
