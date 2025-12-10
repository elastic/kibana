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
  const monacoEditor = getService('monacoEditor');
  const retry = getService('retry');

  describe('ES|QL Editor keyboard shortcuts', function () {
    before(async () => {
      await PageObjects.common.navigateToApp('esql_ux_example');
      await monacoEditor.waitCodeEditorReady('esqlUxExampleEditor');
    });

    async function focusEditor() {
      const editor = await testSubjects.find('esqlUxExampleEditor');
      await (await editor.findByClassName('margin-view-overlays')).click();
    }

    async function isVisorVisible() {
      const visor = await testSubjects.find('ESQLEditor-quick-search-visor');
      const opacity = await visor.getComputedStyle('opacity');

      return opacity === '1';
    }

    describe('Ctrl+K quick search visor', () => {
      it('should open quick search visor with Ctrl+K keyboard shortcut', async () => {
        await monacoEditor.setCodeEditorValue('FROM index | LIMIT 10');
        await focusEditor();

        const editor = await testSubjects.find('esqlUxExampleEditor');
        const textarea = await editor.findByCssSelector('textarea');

        await textarea.type([Key.CONTROL, 'k']);

        await retry.try(async () => {
          const isVisible = await isVisorVisible();
          expect(isVisible).to.be(true);
        });

        const visorInput = await testSubjects.find('ESQLEditor-visor-search-input');
        expect(await visorInput.isDisplayed()).to.be(true);
      });
    });

    describe('Ctrl+Enter run query', () => {
      it('should submit query with Ctrl+Enter keyboard shortcut', async () => {
        await monacoEditor.setCodeEditorValue('FROM index | LIMIT 10');
        await focusEditor();

        const editor = await testSubjects.find('esqlUxExampleEditor');
        const textarea = await editor.findByCssSelector('textarea');

        await textarea.type([Key.CONTROL, Key.ENTER]);

        await retry.try(async () => {
          const calloutExists = await testSubjects.exists('querySubmittedCallout');
          expect(calloutExists).to.be(true);
        });
      });
    });
  });
}
