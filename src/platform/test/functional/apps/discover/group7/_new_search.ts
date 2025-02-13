/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const { common, discover, timePicker, header } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
  ]);
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const dataViews = getService('dataViews');

  describe('discover new search action', function () {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await common.navigateToApp('discover');
      await timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should work correctly for data view mode', async function () {
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'png' });
      await header.waitUntilLoadingHasFinished();
      await queryBar.setQuery('bytes > 15000');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getHitCount()).to.be('353');
      expect(await filterBar.hasFilter('extension', 'png')).to.be(true);
      expect(await queryBar.getQueryString()).to.be('bytes > 15000');

      await discover.clickNewSearchButton();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getHitCount()).to.be('14,004');
      expect(await filterBar.hasFilter('extension', 'png')).to.be(false);
      expect(await queryBar.getQueryString()).to.be('');
    });

    it('should work correctly for a saved search in data view mode', async function () {
      await dataViews.createFromSearchBar({
        name: 'logs*',
        adHoc: true,
        hasTimeField: true,
      });
      await discover.waitUntilSearchingHasFinished();
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'css' });
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await queryBar.setQuery('bytes > 100');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getHitCount()).to.be('2,108');
      expect(await filterBar.hasFilter('extension', 'css')).to.be(true);
      expect(await queryBar.getQueryString()).to.be('bytes > 100');

      await discover.saveSearch('adHoc');
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getHitCount()).to.be('2,108');

      await discover.clickNewSearchButton();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getHitCount()).to.be('14,004');
      expect(await filterBar.hasFilter('extension', 'css')).to.be(false);
      expect(await queryBar.getQueryString()).to.be('');
      expect(await dataViews.getSelectedName()).to.be('logs**');
      expect(await dataViews.isAdHoc()).to.be(true);
    });

    it('should work correctly for ESQL mode', async () => {
      await discover.selectTextBaseLang();

      const testQuery = `from logstash-* | limit 100 | stats countB = count(bytes) by geo.dest | sort countB`;
      await monacoEditor.setCodeEditorValue(testQuery);
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getHitCountInt()).to.greaterThan(10);
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await discover.clickNewSearchButton();
      await discover.waitUntilSearchingHasFinished();
      expect(await monacoEditor.getCodeEditorValue()).to.be('FROM logstash-* | LIMIT 10');
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');
      expect(await discover.getHitCount()).to.be('10');
    });

    it('should work correctly for a saved search in ESQL mode', async () => {
      await discover.selectTextBaseLang();

      const testQuery = `from logstash-* | limit 100 | stats countB = count(bytes) by geo.dest | sort countB`;
      await monacoEditor.setCodeEditorValue(testQuery);
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getHitCountInt()).to.greaterThan(10);

      await discover.saveSearch('esql');
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getHitCountInt()).to.greaterThan(10);

      await discover.clickNewSearchButton();
      await discover.waitUntilSearchingHasFinished();
      expect(await monacoEditor.getCodeEditorValue()).to.be('FROM logstash-* | LIMIT 10');
      expect(await discover.getHitCount()).to.be('10');
    });
  });
}
