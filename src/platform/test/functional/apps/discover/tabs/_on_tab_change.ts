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

  describe('on tab change', function () {
    it('should close the DocViewer on tab change', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();

      await dataGrid.clickRowToggle({ rowIndex: 0 });
      expect(await dataGrid.isShowingDocViewer()).to.be(true);

      // when switching tabs
      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await dataGrid.isShowingDocViewer()).to.be(false);

      // when creating a new tab
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      expect(await dataGrid.isShowingDocViewer()).to.be(true);
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await dataGrid.isShowingDocViewer()).to.be(false);
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

      const expectCustomTimeRange = async () => {
        const timeConfig = await timePicker.getTimeConfig();
        expect(timeConfig.start).to.be('~ 3 months ago');
        expect(timeConfig.end).to.be('now');
      };

      await timePicker.setAbsoluteRange(fromTime, toTime);
      await discover.waitUntilTabIsLoaded();
      await discover.selectIndexPattern('kibana_sample_data_flights');
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(false);
      await expectFlightsTimeRange();
      expect(await discover.getHitCount()).to.be('7,485');

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      expect(await monacoEditor.getCodeEditorValue()).to.be(
        'FROM kibana_sample_data_flights | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend'
      );
      await expectDisabledAllTime(false);
      await expectFlightsTimeRange();
      expect(await discover.getHitCount()).to.be('1,000');

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      const queryWithoutTimeField = 'FROM kibana_sample_data_flights';
      await esql.setEsqlEditorQuery(queryWithoutTimeField);
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();
      expect(await monacoEditor.getCodeEditorValue()).to.be('FROM kibana_sample_data_flights');
      await expectDisabledAllTime(true);
      expect(await discover.getHitCount()).to.be('1,000');

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      const queryWithDefaultTimeField = 'FROM logstash-*';
      await esql.setEsqlEditorQuery(queryWithDefaultTimeField);
      await testSubjects.click('querySubmitButton');
      await expectDisabledAllTime(false);
      await expectFlightsTimeRange();
      expect(await monacoEditor.getCodeEditorValue()).to.be('FROM logstash-*');
      await discover.waitUntilTabIsLoaded();
      await timePicker.setCommonlyUsedTime('Last_90 days');
      await discover.waitUntilTabIsLoaded();
      await expectCustomTimeRange();
      expect(await discover.hasNoResults()).to.be(true);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(false);
      await expectFlightsTimeRange();
      expect(await discover.getHitCount()).to.be('7,485');

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(false);
      await expectFlightsTimeRange();
      expect(await monacoEditor.getCodeEditorValue()).to.be(
        'FROM kibana_sample_data_flights | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend'
      );
      expect(await discover.getHitCount()).to.be('1,000');

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(true);
      expect(await monacoEditor.getCodeEditorValue()).to.be('FROM kibana_sample_data_flights');
      expect(await discover.getHitCount()).to.be('1,000');

      await unifiedTabs.selectTab(3);
      await discover.waitUntilTabIsLoaded();
      await expectDisabledAllTime(false);
      await expectCustomTimeRange();
      expect(await monacoEditor.getCodeEditorValue()).to.be('FROM logstash-*');
      expect(await discover.hasNoResults()).to.be(true);
    });
  });
}
