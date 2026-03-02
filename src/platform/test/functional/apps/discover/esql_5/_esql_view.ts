/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import kbnRison from '@kbn/rison';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const security = getService('security');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const browser = getService('browser');
  const find = getService('find');
  const esql = getService('esql');
  const dataViews = getService('dataViews');

  const { common, discover, timePicker, unifiedFieldList, unifiedSearch } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'unifiedFieldList',
    'unifiedSearch',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
    enableESQL: true,
  };

  describe('discover esql view', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles([
        'kibana_admin',
        'test_logstash_reader',
        'kibana_sample_read',
      ]);
      log.debug('load kibana index with default index pattern');
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      // and load a set of makelogs data
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.load(
        'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.uiSettings.replace(defaultSettings);
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('discover');
      await discover.waitUntilTabIsLoaded();
    });

    after(async () => {
      await timePicker.resetDefaultAbsoluteRangeViaUiSettings();
    });

    describe('switch modal', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
      });

      it('should show switch modal when switching to a data view', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataViewMode();
        await retry.try(async () => {
          await testSubjects.existOrFail('discover-esql-to-dataview-modal');
        });
      });

      it('should not show switch modal when switching to a data view while a saved search is open', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const testQuery = 'from logstash-* | limit 100 | drop @timestamp';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataViewMode();
        await retry.try(async () => {
          await testSubjects.existOrFail('discover-esql-to-dataview-modal');
        });
        await find.clickByCssSelector(
          '[data-test-subj="discover-esql-to-dataview-modal"] .euiModal__closeIcon'
        );
        await retry.try(async () => {
          await testSubjects.missingOrFail('discover-esql-to-dataview-modal');
        });
        await discover.saveSearch('esql_test');
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataViewMode();
        await discover.waitUntilTabIsLoaded();
        await testSubjects.missingOrFail('discover-esql-to-dataview-modal');
      });

      it('should show switch modal when switching to a data view while a saved search with unsaved changes is open', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await discover.saveSearch('esql_test2');
        await discover.waitUntilTabIsLoaded();
        const testQuery = 'from logstash-* | limit 100 | drop @timestamp';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataViewMode();
        await retry.try(async () => {
          await testSubjects.existOrFail('discover-esql-to-dataview-modal');
        });
      });

      it('should show available data views and search results after switching to classic mode', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        await browser.refresh();
        await discover.waitUntilTabIsLoaded();
        await unifiedSearch.switchToDataViewMode();
        await discover.waitUntilTabIsLoaded();
        await discover.assertHitCount('14,004');
        const availableDataViews = await unifiedSearch.getDataViewList(
          'discover-dataView-switch-link'
        );
        ['All logs', 'kibana_sample_data_flights', 'logstash-*'].forEach((item) => {
          expect(availableDataViews).to.contain(item);
        });
        await dataViews.switchToAndValidate('kibana_sample_data_flights');
      });
    });

    describe('inspector', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
      });

      it('shows Discover and Lens requests in Inspector', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        let retries = 0;
        await retry.try(async () => {
          if (retries > 0) {
            await inspector.close();
            await testSubjects.click('querySubmitButton');
            await discover.waitUntilTabIsLoaded();
          }
          await inspector.open();
          retries = retries + 1;
          const requestNames = await inspector.getRequestNames();
          expect(requestNames).to.contain('Table');
          expect(requestNames).to.contain('Visualization');
          const request = await inspector.getRequest(1);
          expect(request.command).to.be('POST /_query/async?drop_null_columns');
        });
      });

      describe('with slow queries', () => {
        it('should show only one entry in inspector for table/visualization', async function () {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: { esql: 'from kibana_sample_data_flights' },
          });
          await common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await discover.selectTextBaseLang();
          await discover.waitUntilTabIsLoaded();
          const testQuery = `from logstash-* | limit 10`;
          await monacoEditor.setCodeEditorValue(testQuery);

          await browser.execute(() => {
            window.ELASTIC_ESQL_DELAY_SECONDS = 5;
          });
          await testSubjects.click('querySubmitButton');
          await discover.waitUntilTabIsLoaded();
          // for some reason the chart query is taking a very long time to return (3x the delay)
          // so wait for the chart to be loaded
          await discover.waitForChartLoadingComplete(1);
          await browser.execute(() => {
            window.ELASTIC_ESQL_DELAY_SECONDS = undefined;
          });

          await inspector.open();
          const requestNames = (await inspector.getRequestNames()).split(',');
          const requestTotalTime = await inspector.getRequestTotalTime();
          expect(requestTotalTime).to.be.greaterThan(5000);
          expect(requestNames.length).to.be(2);
          expect(requestNames).to.contain('Table');
          expect(requestNames).to.contain('Visualization');
        });
      });
    });

    describe('query history', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
      });

      it('should see my current query in the history', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await testSubjects.click('ESQLEditor-toggle-query-history-icon');
        const historyItems = await esql.getHistoryItems();
        await esql.isQueryPresentInTable('FROM logstash-*', historyItems);
      });

      it('updating the query should add this to the history', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = 'from logstash-* | limit 100 | drop @timestamp';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        await testSubjects.click('ESQLEditor-toggle-query-history-icon');
        const historyItems = await esql.getHistoryItems();
        await esql.isQueryPresentInTable(
          'from logstash-* | limit 100 | drop @timestamp',
          historyItems
        );
      });

      it('should select a query from the history and submit it', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await testSubjects.click('ESQLEditor-toggle-query-history-icon');
        // click a history item
        await esql.clickHistoryItem(1);

        const historyItems = await esql.getHistoryItems();
        await esql.isQueryPresentInTable(
          'from logstash-* | limit 100 | drop @timestamp',
          historyItems
        );
      });

      it('should add a failed query to the history', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = 'from logstash-* | limit 100 | woof and meow';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        await testSubjects.click('ESQLEditor-toggle-query-history-icon');
        const historyItem = await esql.getHistoryItem(0);
        await historyItem.findByTestSubject('ESQLEditor-queryHistory-error');
      });
    });
  });
}
