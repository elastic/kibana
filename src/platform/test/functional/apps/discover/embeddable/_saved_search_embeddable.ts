/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Migration recommendation: MIXED. See individual tests.
 */

// Serverless test (remove during Scout migration): x-pack/platform/test/serverless/functional/test_suites/discover/embeddable/_saved_search_embeddable.ts

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const globalNav = getService('globalNav');
  const { common, dashboard, header, discover } = getPageObjects([
    'common',
    'dashboard',
    'header',
    'discover',
  ]);

  describe('discover saved search embeddable', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await common.setTime({
        from: 'Sep 22, 2015 @ 00:00:00.000',
        to: 'Sep 23, 2015 @ 00:00:00.000',
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await common.unsetTime();
      await kibanaServer.uiSettings.unset('defaultIndex');
    });

    beforeEach(async () => {
      await dashboard.navigateToApp();
      await filterBar.ensureFieldEditorModalIsClosed();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
    });

    const addSearchEmbeddableToDashboard = async (title = 'Rendering Test: saved search') => {
      await dashboardAddPanel.addSavedSearch(title);
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    };

    const refreshDashboardPage = async () => {
      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
    };

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Fine persistence/integration test for rows-per-page
     * surviving dashboard save and reload.
     */
    it('can save a search embeddable with a defined rows per page number', async function () {
      const dashboardName = 'Dashboard with a Paginated Saved Search';
      await addSearchEmbeddableToDashboard();
      await dataGrid.checkCurrentRowsPerPageToBe(100);

      await dashboard.saveDashboard(dashboardName, {
        saveAsNew: true,
        waitDialogIsClosed: true,
        exitFromEditMode: false,
      });

      await refreshDashboardPage();

      await dataGrid.checkCurrentRowsPerPageToBe(100);

      await dataGrid.changeRowsPerPageTo(10);

      await dashboard.saveDashboard(dashboardName, { saveAsNew: false });
      await refreshDashboardPage();

      await dataGrid.checkCurrentRowsPerPageToBe(10);
    });

    /**
     * Migration recommendation: DELETE. Column reorder/remove is covered in
     * src/platform/packages/shared/kbn-unified-data-table/src/components/actions/columns.test.ts
     * and data_table.test.tsx.
     */
    it('should control columns correctly', async () => {
      await addSearchEmbeddableToDashboard();
      await dashboard.switchToEditMode();

      const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
      expect(await cell.getVisibleText()).to.be('Sep 22, 2015 @ 23:50:13.253');
      await dataGrid.clickMoveColumnLeft('agent');

      const cellAfter = await dataGrid.getCellElementExcludingControlColumns(0, 0);
      expect(await cellAfter.getVisibleText()).to.be(
        'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)'
      );

      await dataGrid.clickRemoveColumn('agent');
      expect(await cell.getVisibleText()).to.be('Sep 22, 2015 @ 23:50:13.253');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Two panels of the same saved search is a useful
     * smoke test; merge with src/platform/plugins/shared/discover/test/scout/core2/ui/parallel_tests/discover_session_dashboard_reload.spec.ts.
     */
    it('should render duplicate saved search embeddables', async () => {
      await addSearchEmbeddableToDashboard();
      await addSearchEmbeddableToDashboard();
      const [firstGridCell, secondGridCell] = await dataGrid.getAllCellElements();
      const firstGridCellContent = await firstGridCell.getVisibleText();
      const secondGridCellContent = await secondGridCell.getVisibleText();

      expect(firstGridCellContent).to.be.equal(secondGridCellContent);
    });

    /**
     * Migration recommendation: MIXED. Drop the exact document count (data correctness). Keep a short
     * Scout smoke that an invalid KQL query surfaces embeddableError — Discover-app KQL errors are
     * already covered in field_data.spec.ts.
     */
    it('should display an error', async () => {
      await addSearchEmbeddableToDashboard();
      await queryBar.setQuery('bytes > 5000');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      expect(await discover.getSavedSearchDocumentCount()).to.be('2,572 documents');
      await queryBar.setQuery('this < is not : a valid > query');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      const embeddableError = await testSubjects.find('embeddableError');
      const errorMessage = await embeddableError.findByTestSubject('errorMessageMarkdown');
      const errorText = await errorMessage.getVisibleText();
      expect(errorText).to.match(/Expected[\S\s]+but "n" found/);
    });

    /**
     * Migration recommendation: DELETE. DiscoverGridEmbeddable hardcodes showFullScreenButton={false};
     * the prop is covered in src/platform/packages/shared/kbn-unified-data-table/src/components/data_table.test.tsx.
     */
    it('should not show the full screen button', async () => {
      await addSearchEmbeddableToDashboard();
      await testSubjects.missingOrFail('dataGridFullScreenButton');
    });

    /**
     * Migration recommendation: DELETE. The embeddable always passes renderCustomToolbar; toolbar
     * presence is covered in Discover Scout data_grid.spec.ts and discover_documents.test.tsx.
     */
    it('should show the the grid toolbar', async () => {
      await addSearchEmbeddableToDashboard();
      await testSubjects.existOrFail('unifiedDataTableToolbar');
    });

    /**
     * Migration recommendation: DELETE. Highlight rendering is covered in
     * get_render_cell_value.test.tsx and source_document.test.tsx. highlightAll is set in
     * update_search_source.ts. Discover-app highlight UX is in field_data.spec.ts.
     */
    it('should display search highlights', async () => {
      await addSearchEmbeddableToDashboard();
      await queryBar.setQuery('Mozilla');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      const marks = await find.allByCssSelector('.unifiedDataTable__cellValue mark');
      const highlights = await Promise.all(
        marks.map(async (highlight) => await highlight.getVisibleText())
      );
      expect(highlights.length).to.be.greaterThan(0);
      expect(highlights.every((text) => text === 'Mozilla')).to.be(true);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Short smoke that the embeddable opens the doc
     * viewer; flyout internals are unit-tested. Merge with data_grid_context_dashboard.spec.ts.
     */
    it('should expand the detail row when the toggle arrow is clicked', async function () {
      await addSearchEmbeddableToDashboard();
      await retry.try(async function () {
        await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: 0 });
        const detailsEl = await dataGrid.getDetailsRows();
        const defaultMessageEl = await detailsEl[0].findByTestSubject('docViewerRowDetailsTitle');
        expect(defaultMessageEl).to.be.ok();
        await dataGrid.closeFlyout();
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Filter-for / filter-out from an embeddable cell
     * into the dashboard filter bar is a real cross-app flow. Replace the CSS gridcell selector
     * with data-test-subj locators.
     */
    it('filters are added when a cell filter is clicked', async function () {
      await addSearchEmbeddableToDashboard();
      const gridCell = '[role="gridcell"]:nth-child(4)';
      const filterOutButton = '[data-test-subj="filterOutButton"]';
      const filterForButton = '[data-test-subj="filterForButton"]';
      await retry.try(async () => {
        await find.clickByCssSelector(gridCell);
        await find.clickByCssSelector(filterOutButton);
        await header.waitUntilLoadingHasFinished();
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);
      });
      await header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        await find.clickByCssSelector(gridCell);
        await find.clickByCssSelector(filterForButton);
        await header.waitUntilLoadingHasFinished();
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(2);
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Drop exact hit counts; assert the panel still
     * renders after cancel.
     */
    it('can cancel a By Value edit and return to the dashboard', async () => {
      await addSearchEmbeddableToDashboard();
      // Have to unlink else the cancel flow fails?
      await dashboardPanelActions.clickPanelAction('embeddablePanelAction-unlinkFromLibrary');
      await dashboardPanelActions.clickEdit();
      await header.waitUntilLoadingHasFinished();
      await queryBar.setQuery('test');
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('13');
      await discover.clickCancelButton();
      await dashboard.waitForRenderComplete();
      await dashboard.verifyNoRenderErrors();
      expect(await discover.getSavedSearchDocumentCount()).to.be('4,633 documents');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Drop exact document counts. Overlaps with
     * discover_session_dashboard_reload.spec.ts linked vs by-value coverage — keep the
     * "edit does not mutate the linked session" assertion.
     */
    it('can edit a by-value session without it affecting the reference session', async () => {
      await addSearchEmbeddableToDashboard();
      await dashboardPanelActions.clickPanelAction('embeddablePanelAction-unlinkFromLibrary');
      await dashboardPanelActions.clickEdit();
      await header.waitUntilLoadingHasFinished();
      await queryBar.setQuery('test');
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await discover.clickSaveSearchButton();
      await dashboard.waitForRenderComplete();
      await dashboard.verifyNoRenderErrors();
      await addSearchEmbeddableToDashboard();
      expect(await discover.getAllSavedSearchDocumentCount()).to.eql([
        '13 documents',
        '4,633 documents',
      ]);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Navigation contract: leaving an embeddable edit
     * session restores a normal Discover session.
     */
    it('resets back to a normal Discover session if navigated away from an edit session', async () => {
      await addSearchEmbeddableToDashboard();
      await discover.editEmbeddableInDiscover();
      await header.waitUntilLoadingHasFinished();
      // Run validations concurrently
      await Promise.all([
        globalNav
          .getFirstBreadcrumb()
          .then((firstBreadcrumb) => expect(firstBreadcrumb).to.be('Dashboards')),
        discover
          .getSavedSearchTitle()
          .then((lastBreadcrumb) =>
            expect(lastBreadcrumb).to.be('Editing Rendering Test: saved search')
          ),
        testSubjects
          .exists('unifiedTabs_tabsBar', { timeout: 1000 })
          .then((unifiedTabs) => expect(unifiedTabs).to.be(true)),
        discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(true)),
      ]);
      // Navigate to/Refresh page to reset Discover state
      await discover.navigateToApp();
      await header.waitUntilLoadingHasFinished();
      await Promise.all([
        globalNav
          .getFirstBreadcrumb()
          .then((firstBreadcrumb) => expect(firstBreadcrumb).to.be('Discover')),
        discover
          .getSavedSearchTitle()
          .then((lastBreadcrumb) => expect(lastBreadcrumb).to.be(undefined)),
        testSubjects
          .exists('unifiedTabs_tabsBar', { timeout: 1000 })
          .then((unifiedTabs) => expect(unifiedTabs).to.be(true)),
        discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(false)),
      ]);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Save-as-new from a by-value edit should leave
     * dashboard edit mode. Deduplicate with the round-trip suite below via steps.
     */
    it('switches by-value to Discover mode if search is saved as new', async () => {
      await addSearchEmbeddableToDashboard();
      await dashboardPanelActions.clickPanelAction('embeddablePanelAction-unlinkFromLibrary');
      await dashboardPanelActions.clickEdit();
      await header.waitUntilLoadingHasFinished();
      expect(await testSubjects.exists('unifiedTabs_tabsBar', { timeout: 1000 })).to.be(false);
      await discover.saveAsSearch('Rendering Test: saved as search by-value');
      await header.waitUntilLoadingHasFinished();
      // Run validations concurrently
      await Promise.all([
        globalNav
          .getFirstBreadcrumb()
          .then((firstBreadcrumb) => expect(firstBreadcrumb).to.be('Discover')),
        discover
          .getSavedSearchTitle()
          .then((lastBreadcrumb) =>
            expect(lastBreadcrumb).to.be('Rendering Test: saved as search by-value')
          ),
        testSubjects
          .exists('unifiedTabs_tabsBar', { timeout: 1000 })
          .then((unifiedTabs) => expect(unifiedTabs).to.be(true)),
        discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(false)),
      ]);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT as a step when adding a saved search. Column
     * attributes themselves are unit-tested in common/embeddable/transform_utils.test.ts.
     */
    it('should preserve column headers when saved search is added to dashboard', async () => {
      await addSearchEmbeddableToDashboard();
      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql([
          '@timestamp',
          'agent',
          'bytes',
          'clientip',
        ]);
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Same navigation contract for saved-search and
     * ES|QL panels — one spec with steps, not two nested describes. Deduplicate with the
     * by-value / save-as-new tests above.
     */
    describe('edit session round-trip', () => {
      before(async () => {
        await kibanaServer.importExport.load(
          'src/platform/test/functional/fixtures/kbn_archiver/discover'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'src/platform/test/functional/fixtures/kbn_archiver/discover'
        );
      });

      describeEditSessionTests({
        title: 'saved search panel',
        panelName: 'Rendering Test: saved search',
        editingTitle: 'Rendering Test: saved search',
        savedAsTitle: 'Rendering Test: saved as search',
      });

      describeEditSessionTests({
        title: 'ES|QL panel',
        panelName: 'ES|QL Discover Session',
        editingTitle: 'ES|QL Discover Session',
        savedAsTitle: 'ES|QL Discover Session Saved As',
      });
    });
  });

  /**
   * Generates the shared edit-session round-trip tests for a given embeddable type.
   * Each session type (saved search vs ES|QL) exercises the same navigation contract.
   */
  function describeEditSessionTests({
    title,
    panelName,
    editingTitle,
    savedAsTitle,
  }: {
    title: string;
    panelName: string;
    editingTitle: string;
    savedAsTitle: string;
  }) {
    describe(title, () => {
      beforeEach(async () => {
        await dashboard.navigateToApp();
        await filterBar.ensureFieldEditorModalIsClosed();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
      });

      it('can edit a linked session and return to the dashboard', async () => {
        await dashboardAddPanel.addSavedSearch(panelName);
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();
        expect(await discover.getSavedSearchDocumentCount()).to.not.be(undefined);
        await discover.editEmbeddableInDiscover();
        await header.waitUntilLoadingHasFinished();
        // Run validations concurrently
        await Promise.all([
          globalNav
            .getFirstBreadcrumb()
            .then((firstBreadcrumb) => expect(firstBreadcrumb).to.be('Dashboards')),
          discover
            .getSavedSearchTitle()
            .then((lastBreadcrumb) => expect(lastBreadcrumb).to.be(`Editing ${editingTitle}`)),
          testSubjects
            .exists('unifiedTabs_tabsBar', { timeout: 1000 })
            .then((unifiedTabs) => expect(unifiedTabs).to.be(true)),
          discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(true)),
        ]);
        await discover.saveSearch(panelName);
        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getSavedSearchDocumentCount()).to.not.be(undefined);
      });

      it('can edit a by-value session and return to the dashboard', async () => {
        await dashboardAddPanel.addSavedSearch(panelName);
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();
        await dashboardPanelActions.clickPanelAction('embeddablePanelAction-unlinkFromLibrary');
        await dashboardPanelActions.clickEdit();
        await header.waitUntilLoadingHasFinished();
        // Run validations concurrently
        await Promise.all([
          globalNav
            .getFirstBreadcrumb()
            .then((firstBreadcrumb) => expect(firstBreadcrumb).to.be('Dashboards')),
          discover
            .getSavedSearchTitle()
            .then((lastBreadcrumb) => expect(lastBreadcrumb).to.be(`Editing ${editingTitle}`)),
          testSubjects
            .exists('unifiedTabs_tabsBar', { timeout: 1000 })
            .then((unifiedTabs) => expect(unifiedTabs).not.to.be(true)),
          discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(true)),
        ]);
        await discover.clickSaveSearchButton();
        await dashboard.waitForRenderComplete();
        await dashboard.verifyNoRenderErrors();
        expect(await discover.getSavedSearchDocumentCount()).to.not.be(undefined);
      });

      it('switches to Discover mode if search is saved as new', async () => {
        await dashboardAddPanel.addSavedSearch(panelName);
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();
        await discover.editEmbeddableInDiscover();
        await header.waitUntilLoadingHasFinished();
        await discover.saveAsSearch(savedAsTitle);
        await header.waitUntilLoadingHasFinished();
        // Run validations concurrently
        await Promise.all([
          globalNav
            .getFirstBreadcrumb()
            .then((firstBreadcrumb) => expect(firstBreadcrumb).to.be('Discover')),
          discover
            .getSavedSearchTitle()
            .then((lastBreadcrumb) => expect(lastBreadcrumb).to.be(savedAsTitle)),
          testSubjects
            .exists('unifiedTabs_tabsBar', { timeout: 1000 })
            .then((unifiedTabs) => expect(unifiedTabs).to.be(true)),
          discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(false)),
        ]);
      });
    });
  }
}
