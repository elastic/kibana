/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { Key } from 'selenium-webdriver';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');
  const findService = getService('find');
  const browser = getService('browser');

  describe('ES|QL UX examples', function () {
    before(async () => {
      await PageObjects.common.navigateToApp('esql_ux_example');
    });

    describe('ES|QL Editor autocomplete', function () {
      before(async () => {
        await monacoEditor.waitCodeEditorReady('esqlUxExampleEditor');
      });

      async function focusEditor() {
        // Click on margin-view-overlays to focus the editor (same pattern as console_page.ts)
        const editor = await testSubjects.find('esqlUxExampleEditor');
        await (await editor.findByClassName('margin-view-overlays')).click();
      }

      async function waitForSuggestions() {
        await retry.try(async () => {
          const suggestWidget = await findService.byCssSelector('.monaco-editor .suggest-widget');
          const isDisplayed = await suggestWidget.isDisplayed();

          expect(isDisplayed).to.be(true);
        });
      }

      async function waitForSuggestionsHidden() {
        await retry.try(async () => {
          const suggestWidget = await findService.byCssSelector('.monaco-editor .suggest-widget');
          const isDisplayed = await suggestWidget.isDisplayed();

          expect(isDisplayed).to.be(false);
        });
      }

      async function typeInEditor(text: string) {
        await focusEditor();
        const editor = await testSubjects.find('esqlUxExampleEditor');
        const textarea = await editor.findByCssSelector('textarea');

        // Clear editor first with Ctrl+A and Backspace
        await textarea.pressKeys([Key.CONTROL, 'a']);
        await textarea.pressKeys(Key.BACK_SPACE);
        // Type the new text
        await monacoEditor.typeCodeEditorValue(text, 'esqlUxExampleEditor');
      }

      describe('suggestion visibility', () => {
        it('should show suggestions automatically after typing space', async () => {
          await typeInEditor('FROM ');
          await waitForSuggestions();
        });

        it('should show suggestions automatically after pipe and space', async () => {
          await typeInEditor('FROM index | ');

          await waitForSuggestions();
        });
      });

      describe('suggestion selection', () => {
        it('should not insert unwanted characters after operator selection', async () => {
          await typeInEditor('FROM index | WHERE field ');
          await waitForSuggestions();

          await browser.pressKeys(browser.keys.ENTER);

          const finalValue = await monacoEditor.getCodeEditorValue();
          expect(finalValue).to.not.contain('$0');
        });
      });

      describe('editor focus behavior', () => {
        it('should close suggestions when clicking on editor footer', async () => {
          await typeInEditor('FROM index | ');
          await waitForSuggestions();
          // Click on "Run query" text to blur the editor
          await testSubjects.click('ESQLEditor-run-query');
          await waitForSuggestionsHidden();
        });

        it('should automatically show suggestions when refocusing editor', async () => {
          await typeInEditor('FROM index | ');
          await waitForSuggestions();
          await testSubjects.click('ESQLEditor-run-query');
          await focusEditor();
          await waitForSuggestions();
        });
      });
    });
  });
}
