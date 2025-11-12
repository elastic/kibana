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

        // Verify that the Language clients button is disabled for kbn request
        await PageObjects.console.clickContextMenu();
        const languageClientsButton = await testSubjects.find('consoleMenuLanguageClients');
        expect(await languageClientsButton.getAttribute('disabled')).to.be('true');
      });

      it('allows to change default language', async () => {
        await PageObjects.console.clickContextMenu();

        // Wait for menu to be fully open
        await retry.waitFor('context menu to open', async () => {
          return await testSubjects.exists('consoleMenuCopyToLanguage');
        });

        // Check default language badge shows "curl"
        let languageBadge = await testSubjects.find('consoleMenuLanguageBadge');
        let badgeText = await languageBadge.getVisibleText();
        expect(badgeText.toLowerCase()).to.equal('curl');

        // Click "Language clients" to open nested panel
        await testSubjects.click('consoleMenuLanguageClients');

        // Wait for the language clients panel to open
        await retry.waitFor('language clients panel to open', async () => {
          return await testSubjects.exists('languageClientMenuItem-python');
        });

        // Wait for panel animation to complete
        await PageObjects.common.sleep(300);

        // Click "Python" from the language list
        await testSubjects.click('languageClientMenuItem-python');

        // Wait for panel to return to main menu
        await retry.waitFor('panel to return to main menu', async () => {
          return await testSubjects.exists('consoleMenuCopyToLanguage');
        });

        // Wait for panel animation to complete
        await PageObjects.common.sleep(300);

        // Check that the language badge now shows "Python"
        languageBadge = await testSubjects.find('consoleMenuLanguageBadge');
        badgeText = await languageBadge.getVisibleText();
        expect(badgeText).to.equal('Python');
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

  describe('Action panel copy button', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.skipTourIfExists();
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText('GET _search');
    });

    it('should display copy to language button in action panel', async () => {
      const isVisible = await PageObjects.console.isCopyToLanguageActionButtonVisible();
      expect(isVisible).to.be(true);
    });

    it('should copy request as curl when copy button is clicked', async () => {
      await PageObjects.console.clickCopyToLanguageActionButton();

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
        expect(clipboardText).to.contain('_search');
      }
    });

    it('should copy request with selected language from context menu', async () => {
      const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');

      // Open context menu and select Python as language
      await PageObjects.console.clickContextMenu();
      await retry.waitFor('context menu to be open', async () => {
        return await PageObjects.console.isContextMenuOpen();
      });

      // Click "Language clients"
      await testSubjects.click('consoleMenuLanguageClients');
      await PageObjects.common.sleep(PANEL_ANIMATION_DURATION_MS);

      // Wait for the nested panel to be visible
      await retry.waitFor('language clients panel to be visible', async () => {
        return await testSubjects.exists('languageClientMenuItem-python');
      });

      // Click Python
      await testSubjects.click('languageClientMenuItem-python');
      await PageObjects.common.sleep(PANEL_ANIMATION_DURATION_MS);

      // Wait for panel to return to main menu
      await retry.waitFor('panel to return to main menu', async () => {
        return await testSubjects.exists('consoleMenuCopyToLanguage');
      });

      // Verify the badge shows Python
      const badge = await testSubjects.find('consoleMenuLanguageBadge');
      const badgeText = await badge.getVisibleText();
      expect(badgeText).to.be('Python');

      // Close context menu
      await PageObjects.console.clickContextMenu();

      // Now click the copy button in the action panel
      await PageObjects.console.clickCopyToLanguageActionButton();

      // Wait for toast
      const resultToast = await toasts.getElementByIndex(1);
      const toastText = await resultToast.getVisibleText();

      if (toastText.includes('Write permission denied')) {
        log.debug('Write permission denied, skipping test');
        return;
      }

      expect(toastText).to.be('Request copied to clipboard as Python');

      // Check if the clipboard has the Python request
      if (canReadClipboard) {
        const clipboardText = await browser.getClipboardValue();
        // Python requests typically include 'requests' library or other Python-specific syntax
        expect(clipboardText).to.not.contain('curl -X GET');
        // The exact format depends on the conversion, but it should be different from curl
        log.debug('Clipboard content (Python):', clipboardText);
      }
    });

    it('should work independently from context menu copy to language button', async () => {
      // Click action panel copy button
      await PageObjects.console.clickCopyToLanguageActionButton();

      let resultToast = await toasts.getElementByIndex(1);
      let toastText = await resultToast.getVisibleText();

      if (toastText.includes('Write permission denied')) {
        log.debug('Write permission denied, skipping test');
        return;
      }

      expect(toastText).to.be('Request copied to clipboard as curl');

      // Now use context menu to copy as well
      await PageObjects.console.clickContextMenu();
      await retry.waitFor('context menu to be open', async () => {
        return await PageObjects.console.isContextMenuOpen();
      });

      await PageObjects.console.clickCopyToLanguageButton();

      resultToast = await toasts.getElementByIndex(1);
      toastText = await resultToast.getVisibleText();

      expect(toastText).to.be('Request copied to clipboard as curl');

      // Both should work the same way
    });
  });
}
