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

/**
 * Migration recommendation: DELETE. See individual tests. Saved-query CRUD through the
 * popover is already covered in
 * src/platform/plugins/shared/unified_search/test/scout/ui/tests/saved_query_menu_crud.spec.ts.
 * Discover "New" clearing filters/query is covered in
 * src/platform/plugins/shared/discover/test/scout/core2/ui/parallel_tests/new_search_action.spec.ts.
 * The CCS variant only swaps the index pattern to `ftr-remote:logstash-*`.
 */

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const { common, discover, timePicker } = getPageObjects(['common', 'discover', 'timePicker']);
  const browser = getService('browser');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');
  const testSubjects = getService('testSubjects');
  const config = getService('config');
  const dataViews = getService('dataViews');
  const localArchiveDirectories = {
    nested: 'src/platform/test/functional/fixtures/kbn_archiver/date_nested.json',
    discover: 'src/platform/test/functional/fixtures/kbn_archiver/discover.json',
  };
  const remoteArchiveDirectories = {
    nested: 'src/platform/test/functional/fixtures/kbn_archiver/ccs/date_nested.json',
    discover: 'src/platform/test/functional/fixtures/kbn_archiver/ccs/discover.json',
  };
  const logstashIndexPatternString = config.get('esTestCluster.ccs')
    ? 'ftr-remote:logstash-*'
    : 'logstash-*';
  const dateNestedIndexPattern = config.get('esTestCluster.ccs')
    ? 'ftr-remote:date-nested'
    : 'date-nested';
  const defaultSettings = {
    defaultIndex: logstashIndexPatternString,
  };
  const esNode = config.get('esTestCluster.ccs')
    ? getService('remoteEsArchiver' as 'esArchiver')
    : getService('esArchiver');
  const kbnArchives = config.get('esTestCluster.ccs')
    ? remoteArchiveDirectories
    : localArchiveDirectories;

  const from = 'Sep 20, 2015 @ 08:00:00.000';
  const to = 'Sep 21, 2015 @ 08:00:00.000';

  const setUpQueriesWithFilters = async () => {
    await kibanaServer.savedObjects.clean({ types: ['search', 'query'] });
    // set up a query with filters and a time filter
    log.debug('set up a query with filters to save');
    await common.setTime({ from, to });
    await common.navigateToApp('discover');
    await dataViews.switchToAndValidate(logstashIndexPatternString);
    await retry.try(async function tryingForTime() {
      const hitCount = await discover.getHitCount();
      expect(hitCount).to.be('4,731');
    });

    await filterBar.addFilter({ field: 'extension.raw', operation: 'is one of', value: ['jpg'] });
    await retry.try(async function tryingForTime() {
      const hitCount = await discover.getHitCount();
      expect(hitCount).to.be('3,029');
    });

    await queryBar.setQuery('response:200');
    await queryBar.submitQuery();
    await retry.try(async function tryingForTime() {
      const hitCount = await discover.getHitCount();
      expect(hitCount).to.be('2,792');
    });
  };

  describe('saved queries saved objects', function describeIndexTests() {
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern', 'query'] });

      await kibanaServer.importExport.load(kbnArchives.discover);
      await kibanaServer.importExport.load(kbnArchives.nested);
      await esNode.load('src/platform/test/functional/fixtures/es_archiver/date_nested');
      await esNode.load('src/platform/test/functional/fixtures/es_archiver/logstash_functional');

      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await common.navigateToApp('discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload(kbnArchives.discover);
      await kibanaServer.importExport.unload(kbnArchives.nested);
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern', 'query'] });
      await kibanaServer.savedObjects.clean({ types: ['search', 'query'] });
      await esNode.unload('src/platform/test/functional/fixtures/es_archiver/date_nested');
      await esNode.unload('src/platform/test/functional/fixtures/es_archiver/logstash_functional');
      await common.unsetTime();
    });

    describe('saved query selection', () => {
      before(async () => await setUpQueriesWithFilters());

      /**
       * Migration recommendation: DELETE. Clearing filters and the query on New is covered in
       * new_search_action.spec.ts. Switching data views afterward does not change that contract.
       */
      it(`should unselect saved query when navigating to a 'new'`, async function () {
        await savedQueryManagementComponent.saveNewQuery(
          'test-unselect-saved-query',
          'mock',
          true,
          true
        );

        await queryBar.submitQuery();

        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
        expect(await queryBar.getQueryString()).to.eql('response:200');

        await discover.clickNewSearchButton();

        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(false);
        expect(await queryBar.getQueryString()).to.eql('');

        await dataViews.switchToAndValidate(dateNestedIndexPattern);

        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(false);
        expect(await queryBar.getQueryString()).to.eql('');

        await dataViews.switchToAndValidate(logstashIndexPatternString);
        await retry.try(async function tryingForTime() {
          const hitCount = await discover.getHitCount();
          expect(hitCount).to.be('4,731');
        });

        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(false);
        expect(await queryBar.getQueryString()).to.eql('');

        // reset state
        await savedQueryManagementComponent.deleteSavedQuery('test-unselect-saved-query');
      });
    });

    describe('saved query management component functionality', function () {
      before(async () => await setUpQueriesWithFilters());

      /**
       * Migration recommendation: DELETE. Empty-list disablement belongs in a unit test of the
       * saved-query menu, not a Discover CCS browser test.
       */
      it('should show the saved query management load button as disabled when there are no saved queries', async () => {
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        const loadFilterSetBtn = await testSubjects.find('saved-query-management-load-button');
        const isDisabled = await loadFilterSetBtn.getAttribute('disabled');
        expect(isDisabled).to.equal('true');
      });

      /**
       * Migration recommendation: DELETE. Covered by saved_query_menu_crud.spec.ts
       * ("save a brand-new query").
       */
      it('should allow a query to be saved via the saved objects management component', async () => {
        await savedQueryManagementComponent.saveNewQuery(
          'OkResponse',
          '200 responses for .jpg over 24 hours',
          true,
          true
        );

        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponse');
        await savedQueryManagementComponent.savedQueryTextExist('response:200');
      });

      /**
       * Migration recommendation: DELETE. Load-with-filters is covered by saved_query_menu_crud.spec.ts
       * ("load the preloaded `OKJpgs` query"). Time-range restore is saved-query payload, not CCS.
       */
      it('reinstates filters and the time filter when a saved query has filters and a time filter included', async () => {
        await timePicker.setDefaultAbsoluteRange();
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        const timePickerValues = await timePicker.getTimeConfigAsAbsoluteTimes();
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
        expect(timePickerValues.start).to.eql(from);
        expect(timePickerValues.end).to.eql(to);
      });

      /**
       * Migration recommendation: DELETE. URL/state restore of a loaded saved query is not
       * CCS-specific. Cover in the unified_search Scout suite or a Discover URL-state spec if
       * still missing there — not a second copy here.
       */
      it('preserves the currently loaded query when the page is reloaded', async () => {
        await browser.refresh();
        const timePickerValues = await timePicker.getTimeConfigAsAbsoluteTimes();
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
        expect(timePickerValues.start).to.eql(from);
        expect(timePickerValues.end).to.eql(to);
        await retry.waitForWithTimeout('the right hit count', 65000, async () => {
          const hitCount = await discover.getHitCount();
          log.debug(`Found hit count is ${hitCount}. Looking for 2,792.`);
          return hitCount === '2,792';
        });
        expect(await savedQueryManagementComponent.getCurrentlyLoadedQueryID()).to.be('OkResponse');
      });

      /**
       * Migration recommendation: DELETE. Covered by saved_query_menu_crud.spec.ts
       * ("update the loaded query and re-load it").
       */
      it('allows saving changes to a currently loaded query via the saved query management component', async () => {
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery('OkResponse', false, false);
        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponse');
        const contextMenuPanelTitleButton = await testSubjects.exists(
          'contextMenuPanelTitleButton'
        );
        if (contextMenuPanelTitleButton) {
          await testSubjects.click('contextMenuPanelTitleButton');
        }
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        expect(await queryBar.getQueryString()).to.eql('');
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        expect(await queryBar.getQueryString()).to.eql('response:404');
      });

      /**
       * Migration recommendation: DELETE. Covered by saved_query_menu_crud.spec.ts
       * ("save the loaded query as a new copy").
       */
      it('allows saving the currently loaded query as a new query', async () => {
        await queryBar.setQuery('response:400');
        await savedQueryManagementComponent.saveCurrentlyLoadedAsNewQuery(
          'OkResponseCopy',
          '400 responses',
          false,
          false
        );
        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponseCopy');
      });

      /**
       * Migration recommendation: DELETE. Covered by saved_query_menu_crud.spec.ts
       * ("delete the saved queries we created").
       */
      it('allows deleting the currently loaded saved query in the saved query management component and clears the query', async () => {
        await savedQueryManagementComponent.deleteSavedQuery('OkResponseCopy');
        await savedQueryManagementComponent.savedQueryMissingOrFail('OkResponseCopy');
        expect(await queryBar.getQueryString()).to.eql('');
      });

      /**
       * Migration recommendation: DELETE. Duplicate-name validation belongs in a unit test of
       * the saved-query form, not a browser test.
       */
      it('does not allow saving a query with a non-unique name', async () => {
        // this check allows this test to run stand alone, also should fix occacional flakiness
        const savedQueryExists = await savedQueryManagementComponent.savedQueryExist('OkResponse');
        if (!savedQueryExists) {
          await savedQueryManagementComponent.saveNewQuery(
            'OkResponse',
            '200 responses for .jpg over 24 hours',
            true,
            true
          );
          await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        }
        await queryBar.setQuery('response:400');
        await savedQueryManagementComponent.saveNewQueryWithNameError('OkResponse');
      });

      /**
       * Migration recommendation: DELETE. Reloading a saved query to discard local edits is the
       * same load path already covered in saved_query_menu_crud.spec.ts.
       */
      it('resets any changes to a loaded query on reloading the same saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await queryBar.setQuery('response:503');
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        expect(await queryBar.getQueryString()).to.eql('response:404');
      });

      /**
       * Migration recommendation: DELETE. Covered by saved_query_menu_crud.spec.ts
       * (`clearLoadedQuery` in the update step).
       */
      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        expect(await queryBar.getQueryString()).to.eql('');
      });

      /**
       * Migration recommendation: DELETE. Query-language localStorage is unified_search behavior,
       * not Discover CCS. Cover in a unified_search unit test if still missing.
       */
      it('allows clearing if non default language was remembered in localstorage', async () => {
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await queryBar.switchQueryLanguage('lucene');
        await common.navigateToApp('discover'); // makes sure discovered is reloaded without any state in url
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await queryBar.expectQueryLanguageOrFail('lucene'); // make sure lucene is remembered after refresh (comes from localstorage)
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await queryBar.expectQueryLanguageOrFail('kql');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await queryBar.expectQueryLanguageOrFail('lucene');
      });

      /**
       * Migration recommendation: DELETE. Language switch clearing the loaded saved query belongs
       * in a unified_search unit test, not a CCS browser test.
       */
      it('changing language removes saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        await queryBar.switchQueryLanguage('lucene');
        expect(await queryBar.getQueryString()).to.eql('');
      });

      /**
       * Migration recommendation: DELETE. Save-button enablement after a filter change belongs
       * in a unit test of the saved-query menu dirty state.
       */
      it('checks if the "Save query" button becomes enabled after adding filters, even when the query was saved with "Include filters" unchecked', async () => {
        await queryBar.setQuery('response:200');
        await queryBar.submitQuery();
        await savedQueryManagementComponent.saveNewQuery('filterExcluded', '', false, false);
        await savedQueryManagementComponent.savedQueryExistOrFail('filterExcluded');
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        let isSaveButtonDisabled = await testSubjects.getAttribute(
          'saved-query-management-save-button',
          'disabled'
        );
        expect(isSaveButtonDisabled).to.equal(
          'true',
          'Save button should be disabled directly after saving a query'
        );
        await filterBar.addFilter({ field: '@message', operation: 'exists' });
        await savedQueryManagementComponent.openSavedQueryManagementComponent();
        isSaveButtonDisabled = await testSubjects.getAttribute(
          'saved-query-management-save-button',
          'disabled'
        );
        expect(isSaveButtonDisabled).to.equal(
          null,
          'Save button should be enabled after adding a filter'
        );
        const updateQueryButtonExists = await testSubjects.exists(
          'saved-query-management-save-changes-button'
        );
        expect(updateQueryButtonExists).to.equal(true, 'Update query button does not exist');
      });
    });
  });
}
