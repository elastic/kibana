/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Migration recommendation: MIGRATE TO SCOUT (with one exception)
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../ftr_provider_context';

const SAVED_SEARCH_NON_TRANSFORMATIONAL_INITIAL_COLUMNS = 'nonTransformationalInitialColumns';
const SAVED_SEARCH_NON_TRANSFORMATIONAL_CUSTOM_COLUMNS = 'nonTransformationalCustomColumns';
const SAVED_SEARCH_TRANSFORMATIONAL_INITIAL_COLUMNS = 'transformationalInitialColumns';
const SAVED_SEARCH_TRANSFORMATIONAL_CUSTOM_COLUMNS = 'transformationalCustomColumns';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');
  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');
  const { common, discover, header, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover esql columns', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover_esql_columns'
      );
      await kibanaServer.uiSettings.replace(defaultSettings);
      await common.navigateToApp('discover');
      await timePicker.setDefaultAbsoluteRange();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectTextBaseLang();
      await discover.waitUntilSearchingHasFinished();
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover_esql_columns'
      );
    });

    describe('initial columns', function () {
      it('should render initial columns for non-transformational commands correctly', async () => {
        await discover.loadSavedSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_INITIAL_COLUMNS);
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'Summary']);
      });

      it('should render custom columns for non-transformational commands correctly', async () => {
        await discover.loadSavedSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_CUSTOM_COLUMNS);
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes', 'extension']);
      });

      it('should render initial columns for a transformational command correctly', async () => {
        await discover.loadSavedSearch(SAVED_SEARCH_TRANSFORMATIONAL_INITIAL_COLUMNS);
        expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp']);
      });

      it('should render custom columns for a transformational command correctly', async () => {
        const columns = ['ip', 'bytes'];
        await discover.loadSavedSearch(SAVED_SEARCH_TRANSFORMATIONAL_CUSTOM_COLUMNS);
        expect(await dataGrid.getHeaderFields()).to.eql(columns);
      });

      it('should restore columns correctly when switching between saved searches', async () => {
        await discover.loadSavedSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_INITIAL_COLUMNS);
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'Summary']);

        await discover.loadSavedSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_CUSTOM_COLUMNS);
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes', 'extension']);
      });
    });

    describe('changing the query', function () {
      beforeEach(async () => {
        await discover.clickNewSearchButton();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. This test duplicates the cases in src/platform/plugins/shared/discover/public/application/main/state_management/utils/build_esql_fetch_subscribe.test.ts, but it makes sure that the column resetting logic is wired up properly to the UI
       */
      it('should reset columns only for certain query changes', async () => {
        await monacoEditor.setCodeEditorValue('from logstash-* | limit 500');
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'Summary']);

        await unifiedFieldList.clickFieldListItemAdd('bytes');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);

        // same index pattern => don't reset columns
        await monacoEditor.setCodeEditorValue(
          `${await monacoEditor.getCodeEditorValue()} | where bytes > 0`
        );
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);

        // different index pattern => reset columns
        await monacoEditor.setCodeEditorValue('from logs* | limit 500');
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'Summary']);
      });

      /**
       * Migration recommendation: DELETE. This test doesn't add anything beyond what src/platform/plugins/shared/discover/public/application/main/state_management/utils/build_esql_fetch_subscribe.test.ts already covers. The test above already covers that the resetting is wired up in the UI.
       */
      it('should reset columns if available fields or index pattern are different in transformational query', async () => {
        await monacoEditor.setCodeEditorValue('from logstash-* | keep ip, @timestamp | limit 500');
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp']);

        // reset columns if available fields are different
        await monacoEditor.setCodeEditorValue(
          'from logstash-* | keep ip, @timestamp, bytes | limit 500'
        );
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp', 'bytes']);

        // don't reset columns if available fields and index pattern are the same
        await monacoEditor.setCodeEditorValue(
          'from logstash-* | keep ip, @timestamp, bytes | limit 1'
        );
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp', 'bytes']);
        await unifiedFieldList.clickFieldListItemRemove('@timestamp');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['ip', 'bytes']);

        // reset columns if index pattern is different
        await monacoEditor.setCodeEditorValue('from logs* | keep ip, @timestamp, bytes | limit 1');
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp', 'bytes']);
      });

      it('should recover from an error and reset columns correctly when a transformational query is used', async () => {
        await monacoEditor.setCodeEditorValue('from not_an_index');
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.showsErrorCallout();
        await browser.refresh();
        await header.waitUntilLoadingHasFinished();
        await discover.showsErrorCallout();
        await monacoEditor.setCodeEditorValue(
          'from logstash-* | keep ip, @timestamp, bytes | limit 10'
        );
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp', 'bytes']);
      });

      it('should correctly set fields when initial query returns no results', async () => {
        await monacoEditor.setCodeEditorValue('from logstash-* | keep ip, @timestamp | limit 500');
        await timePicker.setCommonlyUsedTime('Last_1 hour');
        await discover.waitUntilTabIsLoaded();
        expect(await dataGrid.getHeaderFields()).to.eql([]);
        await browser.refresh();
        await discover.waitUntilTabIsLoaded();
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
        expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp']);
      });
    });
  });
}
