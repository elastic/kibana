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
  const dataViews = getService('dataViews');
  const retry = getService('retry');
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

  const defaultTimespan =
    'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000 (interval: Auto - 3 hours)';
  const defaultTotalCount = '14,004';

  async function checkNoVis(totalCount: string) {
    await header.waitUntilLoadingHasFinished();
    await discover.waitUntilSearchingHasFinished();

    expect(await discover.isChartVisible()).to.be(false);
    expect(await discover.getHitCount()).to.be(totalCount);
  }

  async function checkHistogramVis(timespan: string, totalCount: string) {
    await header.waitUntilLoadingHasFinished();
    await discover.waitUntilSearchingHasFinished();

    await testSubjects.existOrFail('xyVisChart');
    await testSubjects.existOrFail('unifiedHistogramEditVisualization');
    await testSubjects.existOrFail('unifiedHistogramBreakdownSelectorButton');
    await testSubjects.existOrFail('unifiedHistogramTimeIntervalSelectorButton');
    expect(await discover.getChartTimespan()).to.be(timespan);
    expect(await discover.getHitCount()).to.be(totalCount);
  }

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

    it('should show histogram by default', async () => {
      await checkHistogramVis(defaultTimespan, defaultTotalCount);

      await timePicker.setAbsoluteRange(
        'Sep 20, 2015 @ 00:00:00.000',
        'Sep 20, 2015 @ 23:50:13.253'
      );

      const savedSearchTimeSpan =
        'Sep 20, 2015 @ 00:00:00.000 - Sep 20, 2015 @ 23:50:13.253 (interval: Auto - 30 minutes)';
      const savedSearchTotalCount = '4,756';
      await checkHistogramVis(savedSearchTimeSpan, savedSearchTotalCount);

      await discover.saveSearch('testDefault');

      await checkHistogramVis(savedSearchTimeSpan, savedSearchTotalCount);

      await browser.refresh();

      await checkHistogramVis(savedSearchTimeSpan, savedSearchTotalCount);
    });

    it('should show no histogram for no results view and recover when time range expanded', async () => {
      await timePicker.setAbsoluteRange(
        'Sep 19, 2015 @ 00:00:00.000',
        'Sep 19, 2015 @ 00:00:00.000'
      );

      expect(await discover.hasNoResults()).to.be(true);

      await timePicker.setAbsoluteRange(
        'Sep 20, 2015 @ 00:00:00.000',
        'Sep 20, 2015 @ 00:00:00.000'
      );

      await checkHistogramVis(
        'Sep 20, 2015 @ 00:00:00.000 - Sep 20, 2015 @ 00:00:00.000 (interval: Auto - millisecond)',
        '1'
      );
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForDataView');
    });

    it('should show no histogram for non-time-based data views and recover for time-based data views', async () => {
      await dataViews.createFromSearchBar({
        name: 'logs',
        adHoc: true,
        hasTimeField: true,
        changeTimestampField: `--- I don't want to use the time filter ---`,
      });
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await checkNoVis(defaultTotalCount);

      await dataViews.editFromSearchBar({ newIndexPattern: 'logs', newTimeField: '@timestamp' });
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await checkHistogramVis(defaultTimespan, defaultTotalCount);
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForDataView');
    });

    it('should show no histogram for non-time-based data in data view and ES|QL modes', async () => {
      await dataViews.switchToAndValidate('indices-stats*');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await checkNoVis('50');

      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await checkNoVis('50');
    });

    it('should show ESQL histogram for ES|QL query', async () => {
      await discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue('from logstash-* | limit 10');
      await testSubjects.click('querySubmitButton');

      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '10'
      );

      await timePicker.setAbsoluteRange(
        'Sep 20, 2015 @ 00:00:00.000',
        'Sep 20, 2015 @ 00:00:00.000'
      );

      await checkESQLHistogramVis('Sep 20, 2015 @ 00:00:00.000 - Sep 20, 2015 @ 00:00:00.000', '1');
    });

    it('should be able to customize ESQL histogram and then choose a breakdown field', async () => {
      await discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue('from logstash-* | sort @timestamp desc | limit 100');
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      await discover.changeVisShape('Line');

      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '100'
      );

      expect(await discover.getCurrentVisTitle()).to.be('Line');
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      await discover.chooseBreakdownField('extension');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getCurrentVisTitle()).to.be('Bar');
      });

      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');
      const list = await discover.getHistogramLegendList();
      expect(list).to.eql(['css', 'gif', 'jpg', 'php', 'png']);

      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '100'
      );
    });

    it('should be able to customize ESQL histogram and then choose a breakdown field after switching to another data view', async () => {
      await discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue('from logstash-* | sort @timestamp desc | limit 100');
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      await discover.changeVisShape('Line');

      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '100'
      );

      expect(await discover.getCurrentVisTitle()).to.be('Line');
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      await monacoEditor.setCodeEditorValue('from logs* | sort @timestamp desc | limit 100');
      await testSubjects.click('querySubmitButton');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getCurrentVisTitle()).to.be('Bar');
      });
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      await discover.chooseBreakdownField('extension');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getCurrentVisTitle()).to.be('Bar');
      });

      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');
      const list = await discover.getHistogramLegendList();
      expect(list).to.eql(['css', 'gif', 'jpg', 'php', 'png']);

      await checkESQLHistogramVis(
        'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000',
        '100'
      );
    });
  });
}
