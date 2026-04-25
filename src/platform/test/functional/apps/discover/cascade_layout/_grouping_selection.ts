/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover, unifiedTabs, dashboardControls } = getPageObjects([
    'discover',
    'unifiedTabs',
    'dashboardControls',
  ]);

  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const esql = getService('esql');
  const browser = getService('browser');
  const comboBox = getService('comboBox');
  const retry = getService('retry');

  describe('grouping selection', function () {
    it('does not show the grouping selector for ESQL queries that exceed the configured suggested group limit', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      // Type in an ESQL query that will exceed the configured suggested group limit
      const statsQuery =
        'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip, extension';
      await monacoEditor.setCodeEditorValue(statsQuery);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      expect(await discover.isShowingCascadeLayout()).to.be(false);
    });

    describe('grouping behaviour for valid supported ES|QL grouping queries', () => {
      // ES|QL query that will trigger the cascade layout
      const statsQuery =
        'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip';

      it('should display grouping selector for valid supported ES|QL queries', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        await monacoEditor.setCodeEditorValue(statsQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        expect(await discover.isShowingCascadeLayout()).to.be(true);
      });

      it('should switch back to classic mode from the grouped experience without any errors', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        await monacoEditor.setCodeEditorValue(statsQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        expect(await discover.isShowingCascadeLayout()).to.be(true);

        await discover.selectDataViewMode();
      });

      it('revert to the non-group experience when the none option is selected', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        await monacoEditor.setCodeEditorValue(statsQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        expect(await discover.isShowingCascadeLayout()).to.be(true);

        await testSubjects.click('discoverEnableCascadeLayoutSwitch');

        expect(await testSubjects.exists('discoverGroupBySelectionList')).to.be(true);

        await testSubjects.click('discoverCascadeLayoutOptOutButton');

        await discover.waitUntilTabIsLoaded();

        expect(await discover.isShowingCascadeLayout()).to.be(false);
      });

      it('should display row action context menu when row context action button is clicked', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        await monacoEditor.setCodeEditorValue(statsQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        expect(await discover.isShowingCascadeLayout()).to.be(true);

        // click the first group row context action button
        await find.clickByCssSelector('[data-test-subj*="dscCascadeRowContextActionButton"]');
        expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(true);
      });

      it('should list the number of groups in the row header', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        await monacoEditor.setCodeEditorValue(statsQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        const totalHitsMessage = await testSubjects.getVisibleText('discoverQueryTotalHits');

        const [, countMatchString] = totalHitsMessage.match(/^(.*)\sgroups$/) ?? [];

        // strip out comma separator
        const totalHitCounts = Number(countMatchString.replace(/,/g, ''));

        expect(totalHitCounts).to.be.a('number');

        const rootRows = await find.allByCssSelector('[data-row-type="root"]');

        // we expect the total hits count to possibly be greater the row counts since
        // we only render on the screen up to the point that's visible
        expect(totalHitCounts >= rootRows.length).to.be(true);
      });

      it('should copy to clipboard when "copy to clipboard" context menu item is clicked', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        await monacoEditor.setCodeEditorValue(statsQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        expect(await discover.isShowingCascadeLayout()).to.be(true);

        // click the first group row context action button
        await find.clickByCssSelector('[data-test-subj*="dscCascadeRowContextActionButton"]');
        expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(true);

        // click the copy to clipboard context menu item
        await testSubjects.click('dscCascadeRowContextActionCopyToClipboard');
        // context menu should be closed
        expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(false);

        const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');

        if (canReadClipboard) {
          const clipboardText = await browser.getClipboardValue();
          // expect the clipboard text to be a valid IP address pattern because the query is grouped by clientip
          expect(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clipboardText)).to.be(true);
        }
      });

      describe('field column grouping', () => {
        it('should have the open in new tab action in the row context menu', async () => {
          await discover.selectTextBaseLang();
          await discover.waitUntilTabIsLoaded();

          // Type in an ESQL query that will trigger the cascade layout
          await monacoEditor.setCodeEditorValue(statsQuery);
          await testSubjects.click('querySubmitButton');
          await discover.waitUntilTabIsLoaded();

          expect(await discover.isShowingCascadeLayout()).to.be(true);

          const tabCount = await unifiedTabs.getNumberOfTabs();
          expect(tabCount).to.be(1);

          // click the first group row context action button
          await find.clickByCssSelector('[data-test-subj*="dscCascadeRowContextActionButton"]');
          expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(true);

          expect(await testSubjects.exists('dscCascadeRowContextActionOpenInNewTab')).to.be(true);

          await testSubjects.click('dscCascadeRowContextActionOpenInNewTab');

          expect(await unifiedTabs.getNumberOfTabs()).to.be(tabCount + 1);
          expect(await discover.isShowingCascadeLayout()).to.be(false);

          const newTabQuery = await monacoEditor.getCodeEditorValue();
          expect(newTabQuery).not.to.be(statsQuery);

          // assert new tab query contains the correct match query for the categorize function in the new tab
          expect(
            /FROM logstash-\* \| INLINE STATS count = COUNT\(bytes\), average = AVG\(memory\) BY clientip \| WHERE clientip == .*/.test(
              newTabQuery
            )
          ).to.be(true);
        });
      });

      describe('categorize function grouping', () => {
        const statsQueryWithCategorize =
          'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY CATEGORIZE(@message)';

        it('should render categorize grouping using the pattern cell renderer', async () => {
          await discover.selectTextBaseLang();
          await discover.waitUntilTabIsLoaded();

          // Type in an ESQL query that will trigger the cascade layout, for categorization
          await monacoEditor.setCodeEditorValue(statsQueryWithCategorize);
          await testSubjects.click('querySubmitButton');
          await discover.waitUntilTabIsLoaded();

          expect(await discover.isShowingCascadeLayout()).to.be(true);

          // assert that for categorize rows, the pattern cell renderer is used
          expect(
            (await testSubjects.findAll('*-dscCascadeRowTitlePatternCellRenderer')).length
          ).to.be.greaterThan(0);
        });

        it('should have the open in new tab action in the row context menu', async () => {
          await discover.selectTextBaseLang();
          await discover.waitUntilTabIsLoaded();

          // Type in an ESQL query that will trigger the cascade layout
          await monacoEditor.setCodeEditorValue(statsQueryWithCategorize);
          await testSubjects.click('querySubmitButton');
          await discover.waitUntilTabIsLoaded();

          expect(await discover.isShowingCascadeLayout()).to.be(true);

          const tabCount = await unifiedTabs.getNumberOfTabs();
          expect(tabCount).to.be(1);

          // click the first group row context action button
          await find.clickByCssSelector('[data-test-subj*="dscCascadeRowContextActionButton"]');
          expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(true);

          expect(await testSubjects.exists('dscCascadeRowContextActionOpenInNewTab')).to.be(true);

          await testSubjects.click('dscCascadeRowContextActionOpenInNewTab');

          expect(await unifiedTabs.getNumberOfTabs()).to.be(tabCount + 1);
          expect(await discover.isShowingCascadeLayout()).to.be(false);

          const newTabQuery = await monacoEditor.getCodeEditorValue();
          expect(newTabQuery).not.to.be(statsQueryWithCategorize);

          // assert new tab query contains the correct match query for the categorize function in the new tab
          expect(
            /FROM logstash-\* \| WHERE MATCH\(@message, .*, \{"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"\}\)/.test(
              newTabQuery
            )
          ).to.be(true);
        });
      });
    });

    describe('grouping behaviour for supported ES|QL grouping queries with control variables', () => {
      beforeEach(async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        // input just enough of the query to trigger the editor suggestions
        await esql.typeEsqlEditorQuery(
          'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY ',
          'kibanaCodeEditor'
        );

        // select the "Create control" suggestion
        await esql.selectEsqlSuggestionByLabel('Create control');

        await testSubjects.existOrFail('create_esql_control_flyout');

        await comboBox.set('esqlIdentifiersOptions', 'host');
        await comboBox.set('esqlIdentifiersOptions', 'clientip');
        await comboBox.set('esqlIdentifiersOptions', 'bytes');
        await comboBox.set('esqlIdentifiersOptions', 'memory');
        await comboBox.set('esqlIdentifiersOptions', 'extension');

        await testSubjects.waitForEnabled('saveEsqlControlsFlyoutButton');
        await testSubjects.click('saveEsqlControlsFlyoutButton');

        await discover.waitUntilTabIsLoaded();

        await retry.try(async () => {
          const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
          expect(controlGroupVisible).to.be(true);
        });
      });

      it('should display the cascade layout experience', async () => {
        expect(await discover.isShowingCascadeLayout()).to.be(true);
      });

      it('filtering in on row action should update the query', async () => {
        expect(await discover.isShowingCascadeLayout()).to.be(true);

        const controlId = (await dashboardControls.getAllControlIds())[0];

        await dashboardControls.optionsListOpenPopover(controlId, true);
        // pivot grouping to host field
        await dashboardControls.optionsListPopoverSelectOption('clientip');

        await discover.waitUntilTabIsLoaded();

        await find.clickByCssSelector('[data-test-subj*="dscCascadeRowContextActionButton"]');
        expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(true);

        await testSubjects.click('dscCascadeRowContextActionFilterIn');
        expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(false);

        expect(
          /FROM logstash-\* \| WHERE clientip == "\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}" \| STATS count = COUNT\(bytes\), average = AVG\(memory\) BY \?\?field/.test(
            await esql.getEsqlEditorQuery()
          )
        ).to.be(true);
      });

      it('should update the query on selecting the "filter out" row action', async () => {
        expect(await discover.isShowingCascadeLayout()).to.be(true);

        const controlId = (await dashboardControls.getAllControlIds())[0];

        await dashboardControls.optionsListOpenPopover(controlId, true);
        // pivot grouping to host field
        await dashboardControls.optionsListPopoverSelectOption('clientip');

        await discover.waitUntilTabIsLoaded();

        await find.clickByCssSelector('[data-test-subj*="dscCascadeRowContextActionButton"]');
        expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(true);

        await testSubjects.click('dscCascadeRowContextActionFilterOut');
        expect(await testSubjects.exists('dscCascadeRowContextActionMenu')).to.be(false);

        expect(
          /FROM logstash-\* \| WHERE clientip != "\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}" \| STATS count = COUNT\(bytes\), average = AVG\(memory\) BY \?\?field/.test(
            await esql.getEsqlEditorQuery()
          )
        ).to.be(true);
      });
    });
  });
}
