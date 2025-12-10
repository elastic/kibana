/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');

  describe('ES|QL Editor UI', function () {
    before(async () => {
      await PageObjects.common.navigateToApp('esql_ux_example');
      await monacoEditor.waitCodeEditorReady('esqlUxExampleEditor');
    });

    describe('help popover', () => {
      it('should open help popover when clicking the button', async () => {
        // Open popover
        await testSubjects.click('editorKeyboardShortcutsButton');

        await retry.try(async () => {
          const popoverExists = await testSubjects.exists('editorKeyboardShortcutsPopover');
          expect(popoverExists).to.be(true);
        });
      });
    });

    describe('quick search button', () => {
      async function isVisorVisible() {
        const visor = await testSubjects.find('ESQLEditor-quick-search-visor');
        // The visor uses CSS opacity to show/hide (opacity: 0 when hidden, 1 when visible)
        const opacity = await visor.getComputedStyle('opacity');

        return opacity === '1';
      }

      it('should open quick search visor when clicking the button', async () => {
        const buttonExists = await testSubjects.exists('ESQLEditor-toggle-quick-search-visor');

        if (buttonExists) {
          // Open visor
          await testSubjects.click('ESQLEditor-toggle-quick-search-visor');

          await retry.try(async () => {
            const isVisible = await isVisorVisible();
            expect(isVisible).to.be(true);
          });
        }
      });
    });
  });
}
