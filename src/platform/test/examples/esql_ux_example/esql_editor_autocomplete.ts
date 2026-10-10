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

/**
 * Migration recommendation: MIXED. See individual tests. Suggestion content is Jest in
 * kbn-esql-language (src/language/autocomplete/autocomplete.test.ts); only the Monaco widget wiring needs a browser. Consolidate into one Scout
 * test in the Discover ES|QL suite.
 */

const SOURCE_QUERY = 'FROM logstash-* ';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');
  const esql = getService('esql');

  async function waitForSuggestionWidget(visible: boolean) {
    await retry.try(async () => {
      const suggestWidget = await find.byCssSelector('.monaco-editor .suggest-widget');
      const isDisplayed = await suggestWidget.isDisplayed();

      expect(isDisplayed).to.be(visible);
    });
  }

  describe('ES|QL Editor autocomplete', function () {
    beforeEach(async () => {
      await browser.pressKeys(browser.keys.ESCAPE);
      await esql.setEsqlEditorQuery('');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (as part of the single widget test). Suggestion
     * content is autocomplete.test.ts; only "widget opens on its own" needs a browser.
     *
     * Goal: src/platform/plugins/shared/discover/test/scout/esql/ui/parallel_tests/esql_editor_autocomplete.spec.ts
     * (new spec; one test covering the whole suggest-widget flow).
     */
    it('should show suggestions automatically after typing space', async () => {
      await esql.typeEsqlEditorQuery('FROM ');
      await waitForSuggestionWidget(true);
    });

    /**
     * Migration recommendation: DELETE. Same widget behavior as above; which commands are suggested
     * after a pipe is covered by autocomplete.test.ts.
     */
    it('should show suggestions automatically after pipe and space', async () => {
      await esql.typeEsqlEditorQuery(`${SOURCE_QUERY}| `);
      await waitForSuggestionWidget(true);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (as part of the single widget test). Snippet
     * placeholder ($0) handling happens in Monaco's insertion; unit tests can only assert insertText.
     *
     * Goal: src/platform/plugins/shared/discover/test/scout/esql/ui/parallel_tests/esql_editor_autocomplete.spec.ts
     * (new spec; one test covering the whole suggest-widget flow).
     */
    it('should not insert unwanted characters after operator selection', async () => {
      await esql.typeEsqlEditorQuery(`${SOURCE_QUERY}| WHERE bytes `);
      await waitForSuggestionWidget(true);

      await browser.pressKeys(browser.keys.ENTER);

      const finalValue = await esql.getEsqlEditorQuery();
      expect(finalValue).to.not.contain('$0');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (as part of the single widget test). Inline items are
     * inline_suggest.test.ts; the Tab keybinding (esql_editor.tsx) and ghost text need a real Monaco.
     *
     * Goal: src/platform/plugins/shared/discover/test/scout/esql/ui/parallel_tests/esql_editor_autocomplete.spec.ts
     * (new spec; one test covering the whole suggest-widget flow).
     */
    it('should accept inline suggestion from query history with TAB', async () => {
      await esql.typeEsqlEditorQuery('FROM logstash-');
      await browser.pressKeys('*');

      await retry.tryForTime(30000, async () => {
        const ghostText = await find.byCssSelector('.monaco-editor .ghost-text-decoration');
        expect(await ghostText.isDisplayed()).to.be(true);
      });

      await browser.pressKeys(browser.keys.TAB); // Accept inline suggestion

      await retry.try(async () => {
        const finalValue = await esql.getEsqlEditorQuery();
        expect(finalValue).to.be('FROM logstash-* | WHERE KQL("term")');
      });
    });

    /**
     * Migration recommendation: MIGRATE TO JEST, then DELETE. Add an RTL test for inserting the picked
     * date into the query (esql_editor.tsx); not covered today.
     */
    it('should open timepicker and insert date when selecting a day', async () => {
      await esql.typeEsqlEditorQuery(`${SOURCE_QUERY}| WHERE @timestamp > `);
      await esql.selectEsqlSuggestionByLabel('time picker');

      const todayButton = await find.byCssSelector('.react-datepicker__day--today');
      await todayButton.click();

      const finalValue = await esql.getEsqlEditorQuery();
      expect(finalValue).to.contain('T');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (merge with the refocus test below into one
     * blur/refocus flow). Pure Monaco widget behavior, no unit-testable logic.
     *
     * Goal: src/platform/plugins/shared/discover/test/scout/esql/ui/parallel_tests/esql_editor_autocomplete.spec.ts
     * (new spec; one test covering the whole suggest-widget flow).
     */
    it('should close suggestions when loosing focus', async () => {
      await esql.typeEsqlEditorQuery(`${SOURCE_QUERY}| `);
      await waitForSuggestionWidget(true);

      await browser.pressKeys(browser.keys.ESCAPE);
      await waitForSuggestionWidget(false);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (merge with the test above). Pure Monaco widget
     * behavior; drop the word-wrap toggle step, which is incidental.
     *
     * Goal: src/platform/plugins/shared/discover/test/scout/esql/ui/parallel_tests/esql_editor_autocomplete.spec.ts
     * (new spec; one test covering the whole suggest-widget flow).
     */
    it('should automatically show suggestions when refocusing editor', async () => {
      await esql.typeEsqlEditorQuery(`${SOURCE_QUERY}| `);
      await waitForSuggestionWidget(true);

      await browser.pressKeys(browser.keys.ESCAPE);
      await waitForSuggestionWidget(false);

      await testSubjects.click('ESQLEditor-toggleWordWrap');

      await esql.focusEditor();
      await waitForSuggestionWidget(true);
    });
  });
}
