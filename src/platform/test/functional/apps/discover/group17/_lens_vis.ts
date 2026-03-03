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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const browser = getService('browser');
  
  const { common, discover, header, timePicker } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
  ]);
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  const defaultTimespanESQL = 'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000';

  async function checkESQLHistogramVis(
    timespan: string,
    totalCount: string,
    hasTransformationalCommand = false
  ) {
    await header.waitUntilLoadingHasFinished();
    await discover.waitUntilSearchingHasFinished();

    await testSubjects.existOrFail('xyVisChart');
    await testSubjects.existOrFail('unifiedHistogramSaveVisualization');
    await testSubjects.existOrFail('unifiedHistogramEditFlyoutVisualization');
    await testSubjects.missingOrFail('unifiedHistogramEditVisualization');
    if (hasTransformationalCommand) {
      await testSubjects.missingOrFail('unifiedHistogramBreakdownSelectorButton');
    } else {
      await testSubjects.existOrFail('unifiedHistogramBreakdownSelectorButton');
    }
    await testSubjects.missingOrFail('unifiedHistogramTimeIntervalSelectorButton');
    expect(await discover.getChartTimespan()).to.be(timespan);
    expect(await discover.getHitCount()).to.be(totalCount);
  }

  describe('discover lens vis', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/many_fields'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/many_fields_data_view'
      );
      await browser.setWindowSize(1300, 1000);
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/many_fields_data_view'
      );
      await esArchiver.unload('src/platform/test/functional/fixtures/es_archiver/many_fields');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async function () {
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
    });

    afterEach(async function () {
      await discover.resetQueryMode();
    });

    it('should be able to customize ESQL histogram and save it', async () => {
      await discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue('from logstash-* | limit 10');
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.changeVisShape('Line');

      await discover.saveSearch('testCustomESQLHistogram');

      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );

      expect(await discover.getCurrentVisTitle()).to.be('Line');
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');
    });

    it('should be able to load a saved search with custom histogram vis, edit vis and revert changes', async () => {
      await discover.loadSavedSearch('testCustomESQLHistogram');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Line');

      await discover.ensureNoUnsavedChangesIndicator();
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );

      await discover.changeVisShape('Area');
      expect(await discover.getCurrentVisTitle()).to.be('Area');

      await discover.ensureHasUnsavedChangesIndicator();

      await discover.revertUnsavedChanges();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Line');

      await discover.ensureNoUnsavedChangesIndicator();
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );
    });

    it('should be able to load a saved search with custom histogram vis, edit query and revert changes', async () => {
      await discover.loadSavedSearch('testCustomESQLHistogram');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Line');

      await discover.ensureNoUnsavedChangesIndicator();
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');

      // by changing the query we reset the histogram customization
      await monacoEditor.setCodeEditorValue('from logstash-* | limit 100');
      await testSubjects.click('querySubmitButton');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      // Line has been retained although the query changed!
      expect(await discover.getCurrentVisTitle()).to.be('Line');

      await checkESQLHistogramVis(defaultTimespanESQL, '100');

      await discover.ensureHasUnsavedChangesIndicator();
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 100');

      await discover.revertUnsavedChanges();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Line');
      await testSubjects.existOrFail('xyVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      await checkESQLHistogramVis(defaultTimespanESQL, '10');
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');

      // now we are changing to a different query to check lens suggestion logic too
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageA = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await checkESQLHistogramVis(defaultTimespanESQL, '5', true);
      await discover.chooseLensSuggestion('treemap');

      await discover.ensureHasUnsavedChangesIndicator();
      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageA');

      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await discover.revertUnsavedChanges();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Line');
      await testSubjects.existOrFail('xyVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      await checkESQLHistogramVis(defaultTimespanESQL, '10');
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');
    });

    it('should be able to load a saved search with custom histogram vis and handle invalidations', async () => {
      await discover.loadSavedSearch('testCustomESQLHistogram');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Line');

      await discover.ensureNoUnsavedChangesIndicator();
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      // now we are changing to a different query to check invalidation logic
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageA = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await checkESQLHistogramVis(defaultTimespanESQL, '5', true);
      await discover.chooseLensSuggestion('treemap');

      await discover.ensureHasUnsavedChangesIndicator();
      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageA');

      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await discover.saveSearch('testCustomESQLHistogramInvalidation', true);

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await browser.refresh();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
    });

    it('should be able to load a saved search with custom histogram vis and save new customization', async () => {
      await discover.loadSavedSearch('testCustomESQLHistogram');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Line');

      await discover.ensureNoUnsavedChangesIndicator();
      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');

      // now we are changing to a different query to check invalidation logic
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageA = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await checkESQLHistogramVis(defaultTimespanESQL, '5', true);
      await discover.chooseLensSuggestion('treemap');

      await discover.ensureHasUnsavedChangesIndicator();
      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageA');

      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');

      // now we customize the vis again
      await discover.chooseLensSuggestion('waffle');
      expect(await discover.getCurrentVisTitle()).to.be('Waffle');
      await testSubjects.existOrFail('partitionVisChart');

      await discover.ensureHasUnsavedChangesIndicator();

      await discover.saveSearch('testCustomESQLHistogramInvalidationPlusCustomization', true);

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Waffle');
      await testSubjects.existOrFail('partitionVisChart');

      await browser.refresh();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Waffle');
      await testSubjects.existOrFail('partitionVisChart');
    });
  });
}
