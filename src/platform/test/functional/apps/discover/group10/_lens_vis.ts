/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Migration recommendation: MIXED. See individual tests. This 16-min file is the Discover
 * Lens / ES|QL vis persistence journey. Suggestion types and shape compatibility already
 * live in
 * src/platform/packages/shared/kbn-unified-histogram/services/lens_vis_service.suggestions.test.ts
 * and utils/external_vis_context.test.ts. Saving an invalidated visContext is covered in
 * save_discover_session.test.ts. Classic histogram chrome/persist overlaps
 * test/scout/core/ui/parallel_tests/histogram.spec.ts and histogram_session.spec.ts.
 * Break the save-then-load coupling by seeding
 * `vis_context` with `apiServices.discover.create` (see histogram_session.spec.ts).
 * Use `test.step` only inside a single journey that still fits the 60s budget.
 * Keep the hit-count assertions. No serverless FTR mirror.
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
  const filterBar = getService('filterBar');
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
  const defaultTimespanESQL = 'Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000';
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

    /**
     * Migration recommendation: MIXED. Default histogram chrome is already the landing
     * state of histogram.spec.ts. Persist hide/show after save is histogram_session.spec.ts.
     * Keep the 14,004 → 4,756 hit counts after the time-range change, save, and refresh.
     * Classic chrome (edit/breakdown/interval) can be asserted on this test, not bolted
     * onto the ES|QL customize tests.
     */
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

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Empty time range → no-results → restore
     * histogram is not covered. histogram.spec.ts only recovers from a broken KQL query.
     * Keep hasNoResults + histogramForDataView after expand, and the recovered hit count of 1.
     */
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

    /**
     * Migration recommendation: MIXED. Hiding the histogram when the time field is removed
     * is already in
     * test/scout/core2/ui/parallel_tests/data_view_edit.spec.ts. Restoring @timestamp is
     * the inverse — extend that spec rather than a new one. histogramForDataView is
     * unit-tested in lens_vis_service.suggestions.test.ts.
     */
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

    /**
     * Migration recommendation: DELETE. Chart is omitted when `!isTimeBased && !isESQLQuery`
     * (use_state_props.test.ts, `chart: undefined`). ES|QL without a usable time field →
     * unsupported is lens_vis_service.suggestions.test.ts. Classic hide is already in
     * data_view_edit.spec.ts.
     */
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

    /**
     * Migration recommendation: MIGRATE TO SCOUT. ES|QL chrome (save vis, edit-on-fly,
     * no interval selector) plus time-range update. Suggestion type histogramForESQL is
     * unit-tested; new_search_action.spec.ts only asserts it after New. Keep the 10 / 1
     * hit counts after the time-range change. Own `spaceTest` — do not chain into customize/save.
     */
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

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Line-shape persist on save is the core
     * contract and is not in Scout. Later FTR tests load `testCustomESQLHistogram` —
     * do not chain them here. Seed that session via `apiServices.discover.create` with
     * `vis_context` so each load/revert/invalidate test stays under 60s.
     */
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

    /**
     * Migration recommendation: MIXED. Breakdown forcing bar_stacked is
     * lens_vis_service.suggestions.test.ts. Legend values overlap
     * histogram_breakdown.spec.ts. Keep one Scout step that an ES|QL Line customization
     * flips to Bar when a breakdown is applied; drop the exact legend list.
     */
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

    /**
     * Migration recommendation: DELETE. `from logstash-*` → `from logs*` resetting Line
     * to Bar is the same compatibility path as the query-change revert test below
     * (external_vis_context.test.ts + that Scout step). Breakdown after reset duplicates
     * the test above.
     */
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

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Line → Area → revert is not covered.
     * unsaved_changes_indicator.spec.ts reverts columns/sample size/filters, not vis
     * shape. Own test: seed the Line histogram session via the API, then edit/revert.
     */
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

    /**
     * Migration recommendation: MIXED. Line retained on a compatible `limit` change is
     * isSuggestionShapeAndVisContextCompatible in external_vis_context.test.ts. Keep the
     * Scout journey: query still marks unsaved, incompatible STATS + treemap → revert
     * restores Line + histogramForESQL. Keep the 10 / 100 / 5 hit counts through each query.
     */
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

    /**
     * Migration recommendation: MIXED. Applying overriddenVisContextAfterInvalidation on
     * save is save_discover_session.test.ts. Keep a short Scout step: save-as after
     * STATS → treemap, refresh, still Treemap / lensSuggestion.
     */
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

    /**
     * Migration recommendation: DELETE. Same invalidation path as the test above, then a
     * second suggestion pick (waffle) before save. Fold waffle-after-invalidate into that
     * step if we want two shapes; do not keep a second 16-min FTR case.
     */
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

    /**
     * Migration recommendation: MIGRATE TO SCOUT. First persist of a lensSuggestion
     * (treemap), not a histogram. Later FTR tests load `testCustomESQLVis` /
     * `testCustomESQLVisPartition` — seed those via the session API instead of chaining
     * UI setup. This test can stop after the first save if load tests cover reload.
     */
    it('should be able to customize ESQL vis and save it', async () => {
      await discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await checkESQLHistogramVis(defaultTimespanESQL, '5', true);
      await discover.chooseLensSuggestion('treemap');

      await discover.saveSearch('testCustomESQLVis');
      await discover.saveSearch('testCustomESQLVisPartition', true);

      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');

      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Inverse of the histogram query-revert:
     * treemap → `limit` resets to Bar / histogramForESQL → revert restores treemap →
     * re-save stays treemap. Not in Scout.
     */
    it('should be able to load a saved search with custom vis, edit query and revert changes', async () => {
      await discover.loadSavedSearch('testCustomESQLVisPartition');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await discover.ensureNoUnsavedChangesIndicator();

      // by changing the query we reset the vis customization to histogram
      await monacoEditor.setCodeEditorValue('from logstash-* | limit 100');
      await testSubjects.click('querySubmitButton');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Bar');
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      await checkESQLHistogramVis(defaultTimespanESQL, '100');

      await discover.ensureHasUnsavedChangesIndicator();
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 100');

      await discover.revertUnsavedChanges();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      expect(await monacoEditor.getCodeEditorValue()).to.contain('averageB');

      // should be still Pie after reverting and saving again
      await discover.saveSearch('testCustomESQLVisPartition');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. changeVisShape via the Lens flyout (Pie),
     * persist, then query reset + revert back to Pie. flyouts.spec.ts only opens/closes
     * the flyout against the doc viewer — it does not change shape or persist.
     */
    it('should be able to change to an unfamiliar vis type via lens flyout', async () => {
      await discover.loadSavedSearch('testCustomESQLVisPartition');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');

      await discover.ensureNoUnsavedChangesIndicator();

      await discover.changeVisShape('Pie');

      await discover.ensureHasUnsavedChangesIndicator();

      expect(await discover.getCurrentVisTitle()).to.be('Pie');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await discover.saveSearch('testCustomESQLVisPie', true);

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Pie');
      await testSubjects.existOrFail('partitionVisChart');

      await browser.refresh();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Pie');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      // reset to histogram
      await monacoEditor.setCodeEditorValue('from logstash-*');
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Bar');
      expect(await discover.getVisContextSuggestionType()).to.be('histogramForESQL');

      await discover.ensureHasUnsavedChangesIndicator();

      await discover.revertUnsavedChanges();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Pie');
      await testSubjects.existOrFail('partitionVisChart');
    });

    /**
     * Migration recommendation: DELETE. Waffle → revert → waffle → Treemap → save is the
     * same vis-edit/revert/save contract as the Line → Area revert above. Fold one extra
     * suggestion-picker click into that step if partition vis needs coverage.
     */
    it('should be able to load a saved search with custom vis, edit vis and revert changes', async () => {
      await discover.loadSavedSearch('testCustomESQLVis');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');

      await discover.ensureNoUnsavedChangesIndicator();

      await discover.chooseLensSuggestion('waffle');
      expect(await discover.getCurrentVisTitle()).to.be('Waffle');
      await testSubjects.existOrFail('partitionVisChart');

      await discover.ensureHasUnsavedChangesIndicator();

      await discover.revertUnsavedChanges();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');

      await discover.chooseLensSuggestion('waffle');
      await discover.changeVisShape('Treemap');

      await discover.ensureHasUnsavedChangesIndicator();
      await discover.saveUnsavedChanges();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Unique: revert must close
     * `lnsEditOnFlyFlyout`. flyouts.spec.ts does not cover revert. Own short `spaceTest`.
     */
    it('should close lens flyout on revert changes', async () => {
      await discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getCurrentVisTitle()).to.be('Bar');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await discover.ensureNoUnsavedChangesIndicator();

      await discover.chooseLensSuggestion('treemap');
      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await discover.saveSearch('testCustomESQLVisRevert');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await discover.ensureNoUnsavedChangesIndicator();

      await discover.chooseLensSuggestion('waffle');
      expect(await discover.getCurrentVisTitle()).to.be('Waffle');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');

      await discover.openLensEditFlyout();
      await testSubjects.existOrFail('lnsEditOnFlyFlyout');

      await discover.ensureHasUnsavedChangesIndicator();
      await discover.revertUnsavedChanges();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
      await testSubjects.missingOrFail('lnsEditOnFlyFlyout'); // it should close the flyout
      expect(await discover.getCurrentVisTitle()).to.be('Treemap');
      await testSubjects.existOrFail('partitionVisChart');
      expect(await discover.getVisContextSuggestionType()).to.be('lensSuggestion');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Distinct from
     * request_cancellation.spec.ts (user cancel → warnings). This aborts an in-flight
     * `error_query` stall by changing the time range and asserts histogram + hits recover.
     * initialize_fetch.test.ts only covers embeddable abort. Keep the recovered 4,756 count.
     */
    it('should be able to recover after an aborted request', async () => {
      const reducedTimeRange = {
        from: 'Sep 20, 2015 @ 00:00:00.000',
        to: 'Sep 20, 2015 @ 23:50:13.253',
      };
      const reducedTimeSpan = `${reducedTimeRange.from} - ${reducedTimeRange.to} (interval: Auto - 30 minutes)`;
      const reducedTotalCount = '4,756';

      // add a shorter time range to the recently used list in the time picker
      await timePicker.setAbsoluteRange(reducedTimeRange.from, reducedTimeRange.to);
      await discover.waitUntilTabIsLoaded();

      // go back to default time range
      await timePicker.setDefaultAbsoluteRange();
      await checkHistogramVis(defaultTimespan, defaultTotalCount);

      // trigger the first request
      await filterBar.addDslFilter(
        JSON.stringify({
          error_query: {
            indices: [
              {
                error_type: 'warning',
                message: "'Fake slow request'",
                name: '*',
                stall_time_seconds: 15,
              },
            ],
          },
        }),
        false
      );

      // wait a moment to ensure the request is in flight
      await retry.waitFor('loading state', async () => {
        return (
          (await header.isGlobalLoadingIndicatorVisible()) && (await discover.isDataGridUpdating())
        );
      });

      // by changing the time range it should abort the previous request, fire a new one and recover from the aborted state
      await timePicker.setRecentlyUsedTime(`${reducedTimeRange.from} to ${reducedTimeRange.to}`);

      await retry.try(async () => {
        // check that the histogram is showing data for the new time range
        // and the reported total hits count got updated too
        await checkHistogramVis(reducedTimeSpan, reducedTotalCount);
      });
    });
  });
}
