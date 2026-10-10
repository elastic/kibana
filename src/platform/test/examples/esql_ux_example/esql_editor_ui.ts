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
 * Migration recommendation: MIXED. See individual tests. Most are already covered by Jest in
 * kbn-esql-editor; keep a single Scout smoke test for the error flow in the ES|QL / Discover suite.
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
     * Migration recommendation: MIGRATE TO JEST, then DELETE. Add an RTL test for the button
     * (QueryWrapComponent) and a use_query_actions test for onPrettifyQuery; only the CMD+I keybinding
     * is covered today (custom_editor_commands.test.ts).
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
     * Migration recommendation: DELETE. Covered by editor_visor.test.tsx ("should submit a KQL filter
     * using indexes from the editor query").
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
     * Migration recommendation: DELETE. Covered by custom_editor_commands.test.ts ("calls onQuerySubmit
     * on CMD+Enter ..."). The callout asserted here is only example plugin state.
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
     * Migration recommendation: MIGRATE TO SCOUT (single smoke test, together with the validation test
     * below). Jest covers errors and the popover but mocks validate; keep one end-to-end check with the real
     * validator.
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
     * Migration recommendation: DELETE. Query validity is covered by the kbn-esql-language validation
     * tests; Jest mocks validate, so fold one invalid -> fixed transition into the Scout smoke test above.
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
