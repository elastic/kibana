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

/**
 * Migration recommendation: MOVE ALL TO SCOUT; delete nothing. The Jest tests in kbn-esql-editor mock
 * Monaco actions, QueryStringInput and validation, so none of them exercises the real wiring these
 * tests check. Move to the ES|QL / Discover Scout suite, merging only where flows are identical.
 */

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const browser = getService('browser');
  const esql = getService('esql');

  describe('ES|QL Editor UI', function () {
    beforeEach(async () => {
      await browser.pressKeys(browser.keys.ESCAPE);
      await esql.setEsqlEditorQuery('');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (its own short test).
     * Only the CMD+I keybinding is covered in Jest today (custom_editor_commands.test.ts); mocking the
     * button, the Monaco model and the prettifier is more setup than one end-to-end check with the real
     * editor.
     *
     * Goal: src/platform/plugins/shared/discover/test/scout/esql/ui/parallel_tests/esql_editor.spec.ts
     * (extend the existing "Discover ES|QL editor" suite).
     */
    it('should prettify query when clicking the format button', async () => {
      await esql.setEsqlEditorQuery(
        'FROM logstash-* | WHERE bytes > 200 | STATS count = COUNT(*) BY geo.dest'
      );

      await browser.pressKeys(browser.keys.ESCAPE);
      await testSubjects.click('ESQLEditor-toggleWordWrap');
      await retry.try(async () => {
        const formattedQuery = await esql.getEsqlEditorQuery();
        expect(formattedQuery).to.contain('\n');
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (its own short test). editor_visor.test.tsx covers the
     * query building, but it mocks QueryStringInput and calls onSubmit directly; it does not cover typing
     * in the real input, the submit button and the editor update.
     *
     * Goal: src/platform/plugins/shared/discover/test/scout/esql/ui/parallel_tests/esql_editor.spec.ts
     * (extend the existing "Discover ES|QL editor" suite).
     */
    it('should search with visor using the editor query source', async () => {
      await esql.setEsqlEditorQuery('FROM logstash-*');
      await esql.toggleQuickSearchVisor(true);

      const kqlInput = await testSubjects.find('esqlVisorKQLQueryInput');
      await kqlInput.click();
      await kqlInput.type('test');

      await retry.waitFor('KQL submit button to appear', async () => {
        return await testSubjects.exists('esqlVisorKQLSubmit');
      });
      await testSubjects.click('esqlVisorKQLSubmit');

      await retry.try(async () => {
        const query = await esql.getEsqlEditorQuery();
        expect(query).to.contain('KQL("""test""")');
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (its own short test). custom_editor_commands.test.ts
     * calls the registered Monaco action's run() on a mocked editor; it does not prove that a real
     * Ctrl/Cmd+Enter keypress reaches it. Assert on the submitted query/results in Discover rather than
     * the example plugin callout.
     *
     * Goal: src/platform/plugins/shared/discover/test/scout/esql/ui/parallel_tests/esql_editor.spec.ts
     * (extend the existing "Discover ES|QL editor" suite).
     */
    it('should submit query with Ctrl+Enter keyboard shortcut', async () => {
      await esql.setEsqlEditorQuery('FROM logstash-* | LIMIT 10');

      const editor = await testSubjects.find('ESQLEditor');
      const textarea = await editor.findByCssSelector('textarea');

      await textarea.type([Key.CONTROL, Key.ENTER]);
      await retry.try(async () => {
        const calloutExists = await testSubjects.exists('querySubmittedCallout');
        expect(calloutExists).to.be(true);
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (together with the validation test below, as one
     * footer error flow). Jest (esql_editor.test.tsx) covers the popover but mocks validate; keep an
     * end-to-end check with the real validator.
     *
     * Goal: src/platform/plugins/shared/discover/test/scout/esql/ui/parallel_tests/esql_editor.spec.ts
     * (extend the existing "Discover ES|QL editor" suite).
     */
    it('should show error details when clicking error button in footer', async () => {
      await esql.setEsqlEditorQuery('FROM logstash-* | WHERE wrong_field');

      await retry.try(async () => {
        const errorButton = await testSubjects.find('ESQLEditor-footerPopoverButton-error');
        expect(await errorButton.isDisplayed()).to.be(true);
      });

      await testSubjects.click('ESQLEditor-footerPopoverButton-error');

      await retry.try(async () => {
        const errorContent = await testSubjects.find('ESQLEditor-errors-warnings-content');
        const errorText = await errorContent.getVisibleText();
        expect(errorText).to.contain('wrong_field');
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (merge with the error details test above). Keep the
     * valid -> invalid -> fixed transitions for the footer error button; the eight steps can be trimmed
     * to the distinct ones (e.g. missing operand and mistyped command), since validity of each
     * query is covered by the kbn-esql-language tests.
     *
     * Goal: src/platform/plugins/shared/discover/test/scout/esql/ui/parallel_tests/esql_editor.spec.ts
     * (extend the existing "Discover ES|QL editor" suite).
     */
    it('should update validation when modifying query', async () => {
      // Step 1: Build a complete query
      await esql.setEsqlEditorQuery('FROM logstash-* | WHERE bytes > 100 | STATS count = COUNT(*)');

      await retry.try(async () => {
        const hasError = await testSubjects.exists('ESQLEditor-footerPopoverButton-error');
        expect(hasError).to.be(false);
      });

      // Step 2: Remove STATS clause (keep just FROM and WHERE)
      await esql.setEsqlEditorQuery('FROM logstash-* | WHERE bytes > 100');

      await retry.try(async () => {
        const hasError = await testSubjects.exists('ESQLEditor-footerPopoverButton-error');
        expect(hasError).to.be(false);
      });

      // Step 3: Remove WHERE clause value (introduce error)
      await esql.setEsqlEditorQuery('FROM logstash-* | WHERE bytes >');

      await retry.try(async () => {
        const hasError = await testSubjects.exists('ESQLEditor-footerPopoverButton-error');
        expect(hasError).to.be(true);
      });

      // Step 4: Fix by adding value back
      await esql.setEsqlEditorQuery('FROM logstash-* | WHERE bytes > 200');

      await retry.try(async () => {
        const hasError = await testSubjects.exists('ESQLEditor-footerPopoverButton-error');
        expect(hasError).to.be(false);
      });

      // Step 5: Add LIMIT clause
      await esql.setEsqlEditorQuery('FROM logstash-* | WHERE bytes > 200 | LIMIT 10');

      await retry.try(async () => {
        const hasError = await testSubjects.exists('ESQLEditor-footerPopoverButton-error');
        expect(hasError).to.be(false);
      });

      // Step 6: Delete LIMIT and add SORT
      await esql.setEsqlEditorQuery('FROM logstash-* | WHERE bytes > 200 | SORT bytes DESC');

      await retry.try(async () => {
        const hasError = await testSubjects.exists('ESQLEditor-footerPopoverButton-error');
        expect(hasError).to.be(false);
      });

      // Step 7: Introduce typo in command
      await esql.setEsqlEditorQuery('FROM logstash-* | WHERE bytes > 200 | SORTT bytes DESC');

      await retry.try(async () => {
        const hasError = await testSubjects.exists('ESQLEditor-footerPopoverButton-error');
        expect(hasError).to.be(true);
      });

      // Step 8: Fix typo
      await esql.setEsqlEditorQuery('FROM logstash-* | WHERE bytes > 200 | SORT bytes DESC');

      await retry.try(async () => {
        const hasError = await testSubjects.exists('ESQLEditor-footerPopoverButton-error');
        expect(hasError).to.be(false);
      });
    });
  });
}
