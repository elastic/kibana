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
  const { discover, unifiedTabs, timePicker } = getPageObjects([
    'discover',
    'unifiedTabs',
    'timePicker',
  ]);
  const dataGrid = getService('dataGrid');
  const esql = getService('esql');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');

  const tableTabId = 'doc_view_table';
  const jsonTabId = 'doc_view_source';

  describe('on tab change', function () {
    it('should maintain separate DocViewer state for different tabs and retain it while switching tabs', async () => {
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      expect(await dataGrid.isShowingDocViewer()).to.be(true);

      // Switch to JSON tab in DocViewer
      await dataGrid.clickDocViewerTab(jsonTabId);
      expect(await dataGrid.isDocViewerTabSelected(jsonTabId)).to.be(true);

      // Open new tab, open DocViewer and leave the default Table tab selected
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();

      expect(await dataGrid.isShowingDocViewer()).to.be(false);
      await dataGrid.clickRowToggle({ rowIndex: 1 });
      expect(await dataGrid.isShowingDocViewer()).to.be(true);

      expect(await dataGrid.isDocViewerTabSelected(tableTabId)).to.be(true);

      // Switch back to first tab and verify it retained its state
      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();

      expect(await dataGrid.isShowingDocViewer()).to.be(true);
      expect(await dataGrid.isDocViewerTabSelected(jsonTabId)).to.be(true);

      // Switch back to second tab and verify Table tab is selected
      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();

      expect(await dataGrid.isShowingDocViewer()).to.be(true);
      expect(await dataGrid.isDocViewerTabSelected(tableTabId)).to.be(true);
    });

    it('should close the vis edit flyout on tab change', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();

      await discover.openLensEditFlyout();
      expect(await discover.isLensEditFlyoutOpen()).to.be(true);

      // when switching tabs
      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.isLensEditFlyoutOpen()).to.be(false);

      // when creating a new tab
      await discover.openLensEditFlyout();
      expect(await discover.isLensEditFlyoutOpen()).to.be(true);
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.isLensEditFlyoutOpen()).to.be(false);
    });

    it('should detect time field change in ES|QL query correctly', async () => {
      const expectDisabledAllTime = async (exist: boolean) => {
        await timePicker.timePickerExists();
        if (exist) {
          await testSubjects.existOrFail('kbnQueryBar-datePicker-disabled');
        } else {
          await testSubjects.missingOrFail('kbnQueryBar-datePicker-disabled');
        }
      };

      const fromTime = 'Apr 10, 2018 @ 00:00:00.000';
      const toTime = 'Nov 15, 2018 @ 00:00:00.000';

      const expectFlightsTimeRange = async () => {
        const timeConfig = await timePicker.getTimeConfig();
        expect(timeConfig.start).to.be(fromTime);
        expect(timeConfig.end).to.be(toTime);
      };

      const expectLogstashTimeRange = async () => {
        const timeConfig = await timePicker.getTimeConfig();
        expect(timeConfig.start).to.be('Sep 19, 2015 @ 06:31:44.000');
        expect(timeConfig.end).to.be('Sep 23, 2015 @ 18:31:44.000');
      };

      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(false);
      await expectLogstashTimeRange();
      expect(await discover.getHitCount()).to.be('1,000');

      const queryWithTimeField =
        'FROM kibana_sample_data_flights | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | LIMIT 50';
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(false);
      await timePicker.setAbsoluteRange(fromTime, toTime);
      await discover.waitUntilTabIsLoaded();
      await esql.setEsqlEditorQuery(queryWithTimeField);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();
      expect(await monacoEditor.getCodeEditorValue()).to.be(queryWithTimeField);
      await expectDisabledAllTime(false);
      await expectFlightsTimeRange();
      expect(await discover.getHitCount()).to.be('50');

      const queryWithoutTimeField = 'FROM kibana_sample_data_flights';
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(false);
      await esql.setEsqlEditorQuery(queryWithoutTimeField);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();
      expect(await monacoEditor.getCodeEditorValue()).to.be(queryWithoutTimeField);
      await expectDisabledAllTime(true);
      expect(await discover.getHitCount()).to.be('1,000');

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(false);
      await expectLogstashTimeRange();
      expect(await monacoEditor.getCodeEditorValue()).to.be('FROM logstash-*');
      expect(await discover.getHitCount()).to.be('1,000');

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(false);
      await expectFlightsTimeRange();
      expect(await monacoEditor.getCodeEditorValue()).to.be(queryWithTimeField);
      expect(await discover.getHitCount()).to.be('50');

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(true);
      expect(await monacoEditor.getCodeEditorValue()).to.be(queryWithoutTimeField);
      expect(await discover.getHitCount()).to.be('1,000');

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(false);
      await expectFlightsTimeRange();
      expect(await monacoEditor.getCodeEditorValue()).to.be(queryWithTimeField);
      expect(await discover.getHitCount()).to.be('50');

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(true);
      expect(await monacoEditor.getCodeEditorValue()).to.be(queryWithoutTimeField);
      expect(await discover.getHitCount()).to.be('1,000');
      await esql.setEsqlEditorQuery(queryWithTimeField);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();
      expect(await monacoEditor.getCodeEditorValue()).to.be(queryWithTimeField);
      await expectDisabledAllTime(false);
      await expectFlightsTimeRange();
      expect(await discover.getHitCount()).to.be('50');
    });
  });
}
