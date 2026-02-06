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
export default function ({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const esql = getService('esql');

  describe('ES|QL Editor UI', function () {
    beforeEach(async () => {
      await esql.setEsqlEditorQuery('');
    });

    it('should prettify query when clicking the format button', async () => {
      await esql.setEsqlEditorQuery(
        'FROM logstash-* | WHERE bytes > 200 | STATS count = COUNT(*) BY geo.dest'
      );

      await testSubjects.click('ESQLEditor-toggleWordWrap');
      await retry.try(async () => {
        const formattedQuery = await esql.getEsqlEditorQuery();
        expect(formattedQuery).to.contain('\n');
      });
    });

    it('should change datasource and search with visor', async () => {
      // Open visor with Ctrl+K
      const editor = await testSubjects.find('ESQLEditor');
      const textarea = await editor.findByCssSelector('textarea');
      await textarea.type([Key.CONTROL, 'k']);

      await retry.try(async () => {
        expect(await esql.isQuickSearchVisorVisible()).to.be(true);
      });

      // Change datasource
      await esql.toggleDatasourceDropdown(true);

      const datasourceList = await testSubjects.find('esqlEditor-visor-datasourcesList-switcher');
      const datasourceSearchInput = await datasourceList.findByCssSelector('input[type="search"]');

      await datasourceSearchInput.click();
      await datasourceSearchInput.pressKeys(Key.ARROW_DOWN);
      await datasourceSearchInput.pressKeys(Key.ARROW_DOWN);
      await datasourceSearchInput.pressKeys(Key.ENTER);
      await esql.toggleDatasourceDropdown(false);

      // Search and verify query updated with KQL
      const kqlInput = await testSubjects.find('esqlVisorKQLQueryInput');
      await kqlInput.type('test');
      await kqlInput.pressKeys(Key.ENTER);

      await retry.try(async () => {
        const query = await esql.getEsqlEditorQuery();
        expect(query).to.contain('KQL("""test""")');
      });
    });

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
