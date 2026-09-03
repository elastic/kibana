/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Serverless test (remove during Scout migration): x-pack/platform/test/serverless/functional/test_suites/discover/esql/_esql_view.ts

/**
 * Migration recommendation: MIXED. One 1,000-line file with 28 tests across 10 `describe` blocks.
 * The ES|QL-specific integration (histogram behavior, sorting persistence, chart-state preservation
 * across cell filtering) is worth a browser; the query-string construction, history bookkeeping and
 * error-message parsing it also asserts are already unit tested.
 *
 * Migration target is src/platform/plugins/shared/discover/test/scout/esql, split into several
 * specs rather than one — see the per-block notes for the proposed grouping.
 *
 * Config note: ../config.ts pins `--feature_flags.overrides.discover.cascadeLayoutEnabled=false`.
 * The Scout port must either reproduce that override or be re-validated against the cascade layout,
 * which the specs under test/scout/core/ui/parallel_tests/cascade_layout_*.spec.ts already exercise.
 * Do not carry the flag over without checking whether these assertions still hold with it enabled.
 */

import expect from '@kbn/expect';
import kbnRison from '@kbn/rison';
import { NULL_LABEL } from '@kbn/field-formats-common';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const security = getService('security');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const browser = getService('browser');
  const find = getService('find');
  const esql = getService('esql');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dataViews = getService('dataViews');
  const elasticChart = getService('elasticChart');
  const filterBar = getService('filterBar');

  const {
    appMenu,
    common,
    discover,
    dashboard,
    header,
    timePicker,
    unifiedFieldList,
    unifiedSearch,
  } = getPageObjects([
    'appMenu',
    'common',
    'discover',
    'dashboard',
    'header',
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

    /**
     * Migration recommendation: MIGRATE TO SCOUT, as one spec covering the ES|QL rendering
     * contract. Several tests below are near-duplicates that should collapse during the move.
     */
    describe('ES|QL in Discover', () => {
      beforeEach(async () => {
        await timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT, trimmed to the ES|QL half. This is 25 presence
       * assertions covering both classic and ES|QL chrome; the classic-mode half duplicates
       * test/scout/core2/ui/parallel_tests/view_mode_toggle.spec.ts and panels_toggle_esql.spec.ts.
       * Keep only the deltas that are actually ES|QL-specific — no query bar menu, no `addFilter`,
       * no view mode toggle, no column sorting button, no field edit action — and assert them as a
       * group rather than re-asserting the shared chrome.
       */
      it('should render esql view correctly', async function () {
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        expect(await testSubjects.exists('showQueryBarMenu')).to.be(true);
        expect(await timePicker.timePickerExists()).to.be(true);
        expect(await testSubjects.exists('addFilter')).to.be(true);
        expect(await testSubjects.exists('dscViewModeToggleButton')).to.be(true);
        expect(await testSubjects.exists('unifiedHistogramChart')).to.be(true);
        expect(await testSubjects.exists('discoverQueryHits')).to.be(true);
        await testSubjects.click('app-menu-overflow-button');
        expect(await testSubjects.exists('discoverAlertsButton')).to.be(true);
        await testSubjects.click('app-menu-overflow-button');
        expect(await appMenu.menuItemExists('shareTopNavButton')).to.be(true);
        expect(await testSubjects.exists('docTableExpandToggleColumn')).to.be(true);
        expect(await testSubjects.exists('dataGridColumnSortingButton')).to.be(true);
        expect(await testSubjects.exists('fieldListFiltersFieldSearch')).to.be(true);
        expect(await testSubjects.exists('fieldListFiltersFieldTypeFilterToggle')).to.be(true);
        await testSubjects.click('field-@message-showDetails');
        expect(await testSubjects.exists('discoverFieldListPanelEdit-@message')).to.be(true);

        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        expect(await testSubjects.exists('fieldListFiltersFieldSearch')).to.be(true);
        expect(await testSubjects.exists('ESQLEditor')).to.be(true);
        expect(await timePicker.timePickerExists()).to.be(true);

        expect(await testSubjects.exists('showQueryBarMenu')).to.be(false);
        expect(await testSubjects.exists('addFilter')).to.be(false);
        expect(await testSubjects.exists('dscViewModeToggleButton')).to.be(false);
        // when Lens suggests a table, we render an ESQL based histogram
        expect(await testSubjects.exists('unifiedHistogramChart')).to.be(true);
        expect(await testSubjects.exists('discoverQueryHits')).to.be(true);
        await testSubjects.click('app-menu-overflow-button');
        expect(await testSubjects.exists('discoverAlertsButton')).to.be(true);
        await testSubjects.click('app-menu-overflow-button');
        expect(await appMenu.menuItemExists('shareTopNavButton')).to.be(true);
        // we don't sort for the Document view
        expect(await testSubjects.exists('dataGridColumnSortingButton')).to.be(false);
        expect(await testSubjects.exists('docTableExpandToggleColumn')).to.be(true);
        expect(await testSubjects.exists('fieldListFiltersFieldTypeFilterToggle')).to.be(true);
        await testSubjects.click('field-@message-showDetails');
        expect(await testSubjects.exists('discoverFieldListPanelEditItem')).to.be(false);
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT, merged with the `?_tstart`/`?_tend` test below.
       * The two are a matched pair — histogram absent without a time field, present once the query
       * declares the time params — and reading them together is what makes either meaningful.
       */
      it('should not render the histogram for indices with no @timestamp field', async function () {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = `from kibana_sample_data_flights | limit 10`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        expect(await testSubjects.exists('ESQLEditor')).to.be(true);
        // I am not rendering the histogram for indices with no @timestamp field
        expect(await testSubjects.exists('unifiedHistogramChart')).to.be(false);
      });

      it('should render the histogram for indices with no @timestamp field when the ?_tstart, ?_tend params are in the query', async function () {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = `from kibana_sample_data_flights | limit 10 | where timestamp >= ?_tstart and timestamp <= ?_tend`;

        await monacoEditor.setCodeEditorValue(testQuery);

        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        const fromTime = 'Apr 10, 2018 @ 00:00:00.000';
        const toTime = 'Nov 15, 2018 @ 00:00:00.000';
        await timePicker.setAbsoluteRange(fromTime, toTime);

        expect(await testSubjects.exists('ESQLEditor')).to.be(true);
        expect(await testSubjects.exists('unifiedHistogramChart')).to.be(true);
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Core ES|QL smoke test: a stats query renders an
       * XY chart plus the right first cell. Merge in 'should query an index pattern that doesnt
       * translate to a dataview correctly' below as a second step — same query, different glob.
       */
      it('should perform test query correctly', async function () {
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        const testQuery = `from logstash-* | sort @timestamp | limit 10 | stats countB = count(bytes) by geo.dest | sort countB`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        // here Lens suggests a XY so it is rendered
        expect(await testSubjects.exists('unifiedHistogramChart')).to.be(true);
        expect(await testSubjects.exists('xyVisChart')).to.be(true);
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be('1');
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. A real regression guard — the grid has to
       * recover after an empty time range, which no unit test covers.
       */
      it('should render when switching to a time range with no data, then back to a time range with data', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        const testQuery = `from logstash-* | sort @timestamp | limit 10 | stats countB = count(bytes) by geo.dest | sort countB`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        let cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be('1');
        await timePicker.setAbsoluteRange(
          'Sep 19, 2015 @ 06:31:44.000',
          'Sep 19, 2015 @ 06:31:44.000'
        );
        await discover.waitUntilTabIsLoaded();
        expect(await testSubjects.exists('discoverNoResults')).to.be(true);
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
        cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be('1');
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT, merged into 'should perform test query
       * correctly' as a step. It differs only in `logstash*` vs `logstash-*`.
       */
      it('should query an index pattern that doesnt translate to a dataview correctly', async function () {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        const testQuery = `from logstash* | sort @timestamp | limit 10 | stats countB = count(bytes) by geo.dest | sort countB`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be('1');
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. The `drop_null_columns` round trip is
       * integration, but note the NULL_LABEL cell rendering itself is component behavior owned by
       * kbn-unified-data-table — assert the column order here, not the placeholder styling.
       */
      it('should render correctly if there are empty fields', async function () {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const testQuery = `from logstash-* | limit 10 | keep machine.ram_range, bytes`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
        expect(await cell.getVisibleText()).to.be(NULL_LABEL);
        expect((await dataGrid.getHeaders()).slice(-2)).to.eql([
          'Numberbytes',
          'machine.ram_range',
        ]);
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. A `ROW` query needs no index or archive, so
       * this is one of the cheapest tests in the file to run.
       */
      it('should work without a FROM statement', async function () {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const testQuery = `ROW a = 1, b = "two", c = null`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        await discover.dragFieldToTable('a');
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be('1');
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Brushing the histogram to drive the time picker
       * without creating a filter pill is genuinely browser-only. Replace the
       * `getVisualizationRenderingCount` / `waitForRenderingCount` dance with a Playwright
       * assertion on the resulting time range — the render counter is a Selenium-era workaround.
       */
      it('should allow brushing time series', async () => {
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = `from logstash-* | limit 100`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        const initialTimeConfig = await timePicker.getTimeConfigAsAbsoluteTimes();
        expect(initialTimeConfig.start).to.equal(timePicker.defaultStartTime);
        expect(initialTimeConfig.end).to.equal(timePicker.defaultEndTime);

        const renderingCount = await elasticChart.getVisualizationRenderingCount();
        await discover.brushHistogram();
        await discover.waitUntilTabIsLoaded();
        // no filter pill created for time brush
        expect(await filterBar.getFilterCount()).to.be(0);
        // chart and time picker updated
        await elasticChart.waitForRenderingCount(renderingCount + 1);
        const newDurationHours = await timePicker.getTimeDurationInHours();
        expect(Math.round(newDurationHours)).to.be(17);
      });
    });

    /**
     * Migration recommendation: Cover with a unit test. Returning focus to the editor textarea when
     * the data source picker closes on Escape is focus management inside kbn-esql-editor, and the
     * test already reaches for `browser.execute` and a `document.activeElement` comparison to check
     * it. RTL asserts focus directly and without a browser; add it next to
     * src/platform/packages/private/kbn-esql-editor/src/esql_editor.test.tsx.
     *
     * Also note the `.esqlSourcesBadge` CSS class selector — if any part of this does stay in a
     * browser, it needs a test subject first.
     */
    describe('resource browser', () => {
      it('returns focus to the editor when the data source picker is closed via Escape', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        await monacoEditor.setCodeEditorValue('from logstash-*');

        await retry.try(async () => {
          const badge = await find.byCssSelector('.esqlSourcesBadge');
          await badge.click();
          await testSubjects.existOrFail('esqlDataSourceBrowser');
        });

        await browser.pressKeys(browser.keys.ESCAPE);

        await retry.waitFor('data source picker to close', async () => {
          return !(await testSubjects.exists('esqlDataSourceBrowser'));
        });

        const isEditorFocused = await browser.execute(() => {
          const textarea = document.querySelector('[data-test-subj="ESQLEditor"] textarea');
          return document.activeElement === textarea;
        });
        expect(isEditorFocused).to.be(true);
      });
    });

    /**
     * Migration recommendation: Cover with unit tests, then DELETE. The loop asserts message content
     * ("Couldn't parse Elasticsearch ES|QL query…", no 'undefined' in the string) and the Monaco
     * marker count for four malformed queries — that is parsing and formatting logic, best covered
     * against kbn-esql-editor's helpers with all four inputs as table-driven cases. That an invalid
     * query surfaces the callout at all is already asserted in Scout by
     * test/scout/core2/ui/parallel_tests/view_mode_toggle.spec.ts
     * ('should show an error callout on invalid query').
     */
    describe('errors', () => {
      it('should show error messages for syntax errors in query', async function () {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const brokenQueries = [
          'from logstash-* | limit 10*',
          'from logstash-* | limit A',
          'from logstash-* | where a*',
          'limit 10',
        ];
        for (const testQuery of brokenQueries) {
          await monacoEditor.setCodeEditorValue(testQuery);
          await testSubjects.click('querySubmitButton');
          await discover.waitUntilTabIsLoaded();
          // error in fetching documents because of the invalid query
          await discover.showsErrorCallout();
          const message = await testSubjects.getVisibleText('discoverErrorCalloutMessage');
          expect(message).to.contain(
            "[esql] > Couldn't parse Elasticsearch ES|QL query. Check your query and try again."
          );
          expect(message).to.not.contain('undefined');
          if (message.includes('line')) {
            expect((await monacoEditor.getCurrentMarkers('kibanaCodeEditor')).length).to.eql(1);
          }
        }
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Leaving ES|QL mode has to tear the editor down and
     * restore the classic search bar; nothing below the browser covers that transition.
     */
    describe('switching to a data view', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT, merged with the test below into one spec with
       * two steps. Both assert the same thing — `ESQLEditor` is gone — and differ only in whether a
       * saved search with unsaved changes is open.
       */
      it('should switch to a data view immediately', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataViewMode();
        await discover.waitUntilTabIsLoaded();
        expect(await testSubjects.exists('ESQLEditor')).to.be(false);
      });

      it('should switch to a data view immediately while a saved search with unsaved changes is open', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await discover.saveSearch('esql_test2');
        await discover.waitUntilTabIsLoaded();
        const testQuery = 'from logstash-* | limit 100 | drop @timestamp';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataViewMode();
        await discover.waitUntilTabIsLoaded();
        expect(await testSubjects.exists('ESQLEditor')).to.be(false);
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Distinct from the two above: it asserts the hit
       * count and the full data view list survive the switch, and it does so after a page refresh.
       */
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

    /**
     * Migration recommendation: MIGRATE TO SCOUT. That ES|QL issues exactly two labelled requests
     * (Table and Visualization) is a real contract, and partially overlaps
     * test/scout/tabs/ui/parallel_tests/inspector.spec.ts — reconcile with it rather than adding a
     * third inspector spec. The `retry.try` loop that closes and re-opens the inspector is a flake
     * workaround; Playwright's auto-waiting should make it unnecessary.
     */
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
          await discover.openInspectorFromTabMenu();
          retries = retries + 1;
          const requestNames = await inspector.getRequestNames();
          expect(requestNames).to.contain('Table');
          expect(requestNames).to.contain('Visualization');
          const request = await inspector.getRequest(1);
          expect(request.command).to.be('POST /_query/async?drop_null_columns=true');
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT, but stop paying for the delay. This sets
       * `window.ELASTIC_ESQL_DELAY_SECONDS = 5` and then waits out a chart query that the comment
       * itself says takes three times that. In Playwright, intercept the `_query/async` route and
       * stall the response instead — the point is that a slow query still produces one Table and one
       * Visualization entry, not that the suite actually sleeps for fifteen seconds.
       */
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

          await discover.openInspectorFromTabMenu();
          const requestNames = (await inspector.getRequestNames()).split(',');
          const requestTotalTime = await inspector.getRequestTotalTime();
          expect(requestTotalTime).to.be.greaterThan(5000);
          expect(requestNames.length).to.be(2);
          expect(requestNames).to.contain('Table');
          expect(requestNames).to.contain('Visualization');
        });
      });
    });

    /**
     * Migration recommendation: MIXED, mostly cover with unit tests. History bookkeeping is already
     * covered by
     * src/platform/packages/private/kbn-esql-editor/src/history_local_storage.test.ts (add, update,
     * dedupe, size limits) and the panel rendering by
     * src/platform/packages/private/kbn-esql-editor/src/editor_footer/history_starred_queries.test.tsx.
     * 'should see my current query in the history', 'updating the query should add this to the
     * history' and 'should add a failed query to the history' are all reachable there.
     *
     * These four tests are also order-dependent: 'should select a query from the history and submit
     * it' clicks history item 1 expecting the query the previous test added. Whatever survives the
     * migration must set up its own history rather than inherit it.
     */
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
        await esql.isQueryPresentInTable('FROM logstash-* | SORT @timestamp DESC', historyItems);
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

      /**
       * Migration recommendation: MIGRATE TO SCOUT. The one case that needs the real editor —
       * clicking a history row has to populate Monaco and re-run the query.
       */
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

    /**
     * Migration recommendation: MIGRATE TO SCOUT, but SPLIT. 'should sort correctly' is ~160 lines
     * with ten `retry.waitFor` blocks and covers three separable contracts in a single `it`: that
     * sorting applies and the column badge counts it, that it survives save/reload/reopen, and that
     * it carries into a dashboard panel. When it fails today you cannot tell which one broke.
     * Migrate as three specs and parametrize over the plain field and the custom var.
     */
    describe('sorting', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
      });

      it('should sort correctly', async () => {
        const savedSearchName = 'testSorting';

        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        const testQuery = 'from logstash-* | sort @timestamp | limit 100';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await unifiedFieldList.clickFieldListItemAdd('bytes');

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains an initial value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '1,623';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields'
        );

        await dataGrid.clickDocSortDesc('bytes', 'Sort High-Low');

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the highest value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '17,966';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n1'
        );

        await discover.saveSearch(savedSearchName);

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the same highest value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '17,966';
        });

        await browser.refresh();

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the same highest value after reload', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '17,966';
        });

        await discover.clickNewSearchButton();

        await discover.waitUntilTabIsLoaded();

        await discover.loadSavedSearch(savedSearchName);

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor(
          'first cell contains the same highest value after reopening',
          async () => {
            const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
            const text = await cell.getVisibleText();
            return text === '17,966';
          }
        );

        await dataGrid.clickDocSortDesc('bytes', 'Sort Low-High');

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the lowest value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '0';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n1'
        );

        await unifiedFieldList.clickFieldListItemAdd('extension');

        await discover.waitUntilTabIsLoaded();

        await dataGrid.clickDocSortDesc('extension', 'Sort A-Z');

        await retry.waitFor('first cell contains the lowest value for extension', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 2);
          const text = await cell.getVisibleText();
          return text === 'css';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n2'
        );

        await browser.refresh();

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the same lowest value after reload', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '0';
        });

        await retry.waitFor(
          'first cell contains the same lowest value for extension after reload',
          async () => {
            const cell = await dataGrid.getCellElementExcludingControlColumns(0, 2);
            const text = await cell.getVisibleText();
            return text === 'css';
          }
        );

        await discover.saveSearch(savedSearchName);
        await discover.waitUntilTabIsLoaded();

        await common.navigateToApp('dashboard');
        await dashboard.clickNewDashboard();
        await timePicker.setDefaultAbsoluteRange();
        await dashboardAddPanel.clickAddFromLibrary();
        await dashboardAddPanel.addSavedSearch(savedSearchName);
        await header.waitUntilLoadingHasFinished();

        await retry.waitFor(
          'first cell contains the same lowest value as dashboard panel',
          async () => {
            const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
            const text = await cell.getVisibleText();
            return text === '0';
          }
        );

        await retry.waitFor(
          'first cell contains the lowest value for extension as dashboard panel',
          async () => {
            const cell = await dataGrid.getCellElementExcludingControlColumns(0, 2);
            const text = await cell.getVisibleText();
            return text === 'css';
          }
        );

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n2'
        );
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT, folded into the split above as the `var0` case.
       * It repeats the apply/save/reload/reopen sequence verbatim with a different column.
       */
      it('should sort on custom vars too', async () => {
        const savedSearchName = 'testSortingForCustomVars';

        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        const testQuery =
          'from logstash-* | sort @timestamp | limit 100 | keep bytes | eval var0 = abs(bytes) + 1';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains an initial value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '1,624';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields'
        );

        await dataGrid.clickDocSortDesc('var0', 'Sort High-Low');

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the highest value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '17,967';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n1'
        );

        await discover.saveSearch(savedSearchName);

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the same highest value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '17,967';
        });

        await browser.refresh();

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the same highest value after reload', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '17,967';
        });

        await discover.clickNewSearchButton();

        await discover.waitUntilTabIsLoaded();

        await discover.loadSavedSearch(savedSearchName);

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor(
          'first cell contains the same highest value after reopening',
          async () => {
            const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
            const text = await cell.getVisibleText();
            return text === '17,967';
          }
        );

        await dataGrid.clickDocSortDesc('var0', 'Sort Low-High');

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the lowest value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === '1';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n1'
        );
      });
    });

    /**
     * Migration recommendation: MIXED. The generated ES|QL strings these tests assert are already
     * covered exhaustively by
     * src/platform/packages/shared/kbn-esql-utils/src/utils/append_to_query/append_where.test.ts
     * (append, negate, append-to-existing-WHERE) and the Discover-side wiring by
     * src/platform/plugins/shared/discover/public/application/main/state_management/redux/actions/tab_state_filters.test.ts.
     * What is left for a browser is that the data grid's filter buttons reach that code and that the
     * visualization survives it.
     */
    describe('filtering by clicking on the table in Discover', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT as a single wiring test, merged with 'should
       * append an end in existing where clause by clicking the table' below. Both assert exact query
       * strings that append_where.test.ts already pins down; one browser test proving the grid
       * button reaches the action is enough.
       */
      it('should append a where clause by clicking the table', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const testQuery = `from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB`;
        await monacoEditor.setCodeEditorValue(testQuery);

        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await dataGrid.clickCellFilterForButtonExcludingControlColumns(0, 1);
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(
          `from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB\n| WHERE \`geo.dest\` == "BT"`
        );

        // negate
        await dataGrid.clickCellFilterOutButtonExcludingControlColumns(0, 1);
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const newValue = await monacoEditor.getCodeEditorValue();
        expect(newValue).to.eql(
          `from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB\n| WHERE \`geo.dest\`!= "BT"`
        );
      });

      it('should append an end in existing where clause by clicking the table', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const testQuery = `from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB | where countB > 0`;
        await monacoEditor.setCodeEditorValue(testQuery);

        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await dataGrid.clickCellFilterForButtonExcludingControlColumns(0, 1);
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(
          `from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB | where countB > 0\nAND \`geo.dest\` == "BT"`
        );
      });

      /**
       * Migration recommendation: DELETE. Strict subset of the test below, which asserts the chart
       * type is preserved *and* that a customized series color survives the same filter.
       */
      it('should append a where clause by clicking the table without changing the chart type', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const testQuery = `from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB`;
        await monacoEditor.setCodeEditorValue(testQuery);

        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        // change the type to line
        await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('lnsChartSwitchPopover');
        await testSubjects.click('lnsChartSwitchPopover_line');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('applyFlyoutButton');

        await dataGrid.clickCellFilterForButtonExcludingControlColumns(0, 1);
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(
          `from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB\n| WHERE \`geo.dest\` == "BT"`
        );

        // check that the type is still line
        await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
        await header.waitUntilLoadingHasFinished();
        const chartSwitcher = await testSubjects.find('lnsChartSwitchPopover');
        const type = await chartSwitcher.getVisibleText();
        expect(type).to.be('Line');
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. That cell filtering does not silently reset a
       * customized visualization is the highest-value assertion in this block. Drop the
       * `common.sleep(1000)` debounce wait — Playwright should assert on the committed color value
       * instead.
       */
      it('should append a where clause by clicking the table without changing the chart type nor the visualization state', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const testQuery = `from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB`;
        await monacoEditor.setCodeEditorValue(testQuery);

        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        // change the type to line
        await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('lnsChartSwitchPopover');
        await testSubjects.click('lnsChartSwitchPopover_line');

        // change the color to red
        await testSubjects.click('lnsXY_yDimensionPanel');
        const colorPickerInput = await testSubjects.find('~indexPattern-dimension-colorPicker');
        await colorPickerInput.clearValueWithKeyboard();
        await colorPickerInput.type('#ff0000');
        await common.sleep(1000); // give time for debounced components to rerender

        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('lns-indexPattern-dimensionContainerClose');
        await testSubjects.click('applyFlyoutButton');

        await dataGrid.clickCellFilterForButtonExcludingControlColumns(0, 1);
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(
          `from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB\n| WHERE \`geo.dest\` == "BT"`
        );

        // check that the type is still line
        await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
        await header.waitUntilLoadingHasFinished();
        const chartSwitcher = await testSubjects.find('lnsChartSwitchPopover');
        const type = await chartSwitcher.getVisibleText();
        expect(type).to.be('Line');

        // check that the color is still red
        await testSubjects.click('lnsXY_yDimensionPanel');
        const colorPickerInputAfterFilter = await testSubjects.find(
          '~indexPattern-dimension-colorPicker'
        );
        expect(await colorPickerInputAfterFilter.getAttribute('value')).to.be('#FF0000');
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Filtering an ES|QL saved search from inside a
     * dashboard panel is a cross-app contract with no coverage below the browser, and the negative
     * half (clicking an aggregated value offers no filter button) is the interesting part.
     *
     * The raw `[role="gridcell"]:nth-child(4)` selectors must become test-subject based during the
     * migration — they silently target the wrong column whenever the grid's control columns change.
     */
    describe('filtering by clicking on the table in Dashboards', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
      });

      it('should append a filter badge by clicking the table', async () => {
        const savedSearchName = 'esql filter from table';
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const testQuery = `from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB`;
        await monacoEditor.setCodeEditorValue(testQuery);

        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await discover.saveSearch(savedSearchName);

        await discover.waitUntilTabIsLoaded();

        // Add to dashboard
        await common.navigateToApp('dashboard');
        await dashboard.clickNewDashboard();

        await timePicker.setDefaultAbsoluteRange();
        await dashboardAddPanel.clickAddFromLibrary();
        await dashboardAddPanel.addSavedSearch(savedSearchName);
        await header.waitUntilLoadingHasFinished();

        const gridCellGroupBy = '[role="gridcell"]:nth-child(4)';
        const gridCellAggValue = '[role="gridcell"]:nth-child(3)';
        const filterForButton = '[data-test-subj="filterForButton"]';

        // This should add a filter badge
        await retry.try(async () => {
          await find.clickByCssSelector(gridCellGroupBy);
          await find.clickByCssSelector(filterForButton);
          await header.waitUntilLoadingHasFinished();
          const filterCount = await filterBar.getFilterCount();
          expect(filterCount).to.equal(1);
        });

        // This shound not add another filter badge
        await header.waitUntilLoadingHasFinished();
        await retry.try(async () => {
          await find.clickByCssSelector(gridCellAggValue);
          const filterButtonExists = await find.existsByCssSelector(filterForButton);
          expect(filterButtonExists).to.be(false);
        });
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT as one spec with steps. These four tests share a
     * single `before` and run as a chain — 'should add filter using histogram legend values' acts on
     * the breakdown the previous test selected, and the one after it starts by reverting that
     * filter. That is a sequence, not four independent tests, and it should be written as one.
     */
    describe('histogram breakdown', () => {
      before(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
      });

      it('should choose breakdown field', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        const testQuery = 'from logstash-*';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        await discover.chooseBreakdownField('extension');
        await discover.waitUntilTabIsLoaded();
        const list = await discover.getHistogramLegendList();
        expect(list).to.eql(['css', 'gif', 'jpg', 'php', 'png']);
      });

      it('should add filter using histogram legend values', async () => {
        await discover.clickLegendFilter('png', '+');
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(`from logstash-*\n| WHERE \`extension\` == "png"`);
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Breakdown persistence through save, new search
       * and reload is worth keeping as its own assertion.
       */
      it('should save breakdown field in saved search', async () => {
        // revert the filter
        const testQuery = 'from logstash-*';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        await discover.saveSearch('esql view with breakdown');
        await discover.waitUntilTabIsLoaded();

        await discover.clickNewSearchButton();
        await header.waitUntilLoadingHasFinished();
        const prevList = await discover.getHistogramLegendList();
        expect(prevList).to.eql([]);

        await discover.loadSavedSearch('esql view with breakdown');
        await discover.waitUntilTabIsLoaded();
        const list = await discover.getHistogramLegendList();
        expect(list).to.eql(['css', 'gif', 'jpg', 'php', 'png']);
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT, merged with 'should choose breakdown field'.
       * Identical assertion, reached from the field stats popover instead of the breakdown selector.
       */
      it('should choose breakdown field when selected from field stats', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        const testQuery = 'from logstash-*';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        await unifiedFieldList.clickFieldListAddBreakdownField('extension');
        await discover.waitUntilTabIsLoaded();
        const list = await discover.getHistogramLegendList();
        expect(list).to.eql(['css', 'gif', 'jpg', 'php', 'png']);
      });
    });
  });
}
