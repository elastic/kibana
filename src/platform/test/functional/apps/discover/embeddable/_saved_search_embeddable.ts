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
    });

    beforeEach(async () => {
      await dashboard.navigateToApp();
      await filterBar.ensureFieldEditorModalIsClosed();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
    });

    const searchSourceJSON = (query: string) =>
      JSON.stringify({
        highlightAll: true,
        version: true,
        query: {
          language: 'kuery',
          query,
        },
        filter: [],
        indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      });

    const defaultTab = {
      id: 'default-tab',
      label: 'Default tab',
      attributes: {
        columns: ['@timestamp', 'agent'],
        sort: [['@timestamp', 'desc']],
        grid: {},
        hideChart: false,
        isTextBasedQuery: false,
        kibanaSavedObjectMeta: {
          searchSourceJSON: searchSourceJSON(''),
        },
      },
    };

    const filteredTab = {
      id: 'filtered-tab',
      label: 'Filtered tab',
      attributes: {
        columns: ['bytes', 'clientip'],
        sort: [['bytes', 'asc']],
        grid: {},
        hideChart: false,
        isTextBasedQuery: false,
        kibanaSavedObjectMeta: {
          searchSourceJSON: searchSourceJSON('bytes > 5000'),
        },
      },
    };

    const filteredTab2 = {
      id: 'filtered-tab-2',
      label: 'Filtered tab 2',
      attributes: {
        columns: ['bytes', 'clientip', 'agent'],
        sort: [['bytes', 'asc']],
        grid: {},
        hideChart: false,
        isTextBasedQuery: false,
        kibanaSavedObjectMeta: {
          searchSourceJSON: searchSourceJSON('bytes > 5000'),
        },
      },
    };

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

    const createMultiTabSavedSearch = async ({ id, title }: { id: string; title: string }) => {
      await kibanaServer.savedObjects.create({
        type: 'search',
        id,
        overwrite: true,
        attributes: {
          title,
          description: '',
          columns: defaultTab.attributes.columns,
          sort: defaultTab.attributes.sort,
          grid: {},
          hideChart: false,
          isTextBasedQuery: false,
          kibanaSavedObjectMeta: {
            searchSourceJSON: searchSourceJSON(''),
          },
          tabs: [defaultTab, filteredTab, filteredTab2],
        },
        references: [
          {
            id: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            type: 'index-pattern',
          },
        ],
      });
    };

    const selectEmbeddableTab = async (tabId: string, tabLabel: string) => {
      await retry.try(async () => {
        await testSubjects.click('discoverEmbeddableTabSelector');
        await find.clickByCssSelector(`[role="option"][id="${tabId}"]`);
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        const selectedTabText = await testSubjects.getVisibleText('discoverEmbeddableTabSelector');
        expect(selectedTabText).to.contain(tabLabel);
      });
    };

    const removeFilteredTabFromSavedSearch = async (id: string) => {
      await kibanaServer.savedObjects.update({
        type: 'search',
        id,
        attributes: {
          tabs: [defaultTab, filteredTab2],
        },
      });
    };

    const getDeletedTabCalloutText = async () => {
      const deletedTabCallout = await testSubjects.find('discoverEmbeddableDeletedTabCallout');
      return await deletedTabCallout.getVisibleText();
    };

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

    it('should render duplicate saved search embeddables', async () => {
      await addSearchEmbeddableToDashboard();
      await addSearchEmbeddableToDashboard();
      const [firstGridCell, secondGridCell] = await dataGrid.getAllCellElements();
      const firstGridCellContent = await firstGridCell.getVisibleText();
      const secondGridCellContent = await secondGridCell.getVisibleText();

      expect(firstGridCellContent).to.be.equal(secondGridCellContent);
    });

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

    it('should not show the full screen button', async () => {
      await addSearchEmbeddableToDashboard();
      await testSubjects.missingOrFail('dataGridFullScreenButton');
    });

    it('should show the the grid toolbar', async () => {
      await addSearchEmbeddableToDashboard();
      await testSubjects.existOrFail('unifiedDataTableToolbar');
    });

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

    it('can edit a session and return to the dashboard', async () => {
      await addSearchEmbeddableToDashboard('logstash hits');
      expect(await discover.getSavedSearchDocumentCount()).to.be('4,633 documents');
      await dashboardPanelActions.clickEdit();
      await header.waitUntilLoadingHasFinished();
      // Run validations concurrently
      await Promise.all([
        globalNav
          .getFirstBreadcrumb()
          .then((firstBreadcrumb) => expect(firstBreadcrumb).to.be('Dashboards')),
        discover
          .getSavedSearchTitle()
          .then((lastBreadcrumb) => expect(lastBreadcrumb).to.be('Editing logstash hits')),
        testSubjects
          .exists('unifiedTabs_tabsBar', { timeout: 1000 })
          .then((unifiedTabs) => expect(unifiedTabs).to.be(true)),
        discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(true)),
      ]);
      await queryBar.setQuery('test');
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await discover.saveSearch('logstash hits');
      await dashboard.waitForRenderComplete();
      await dashboard.verifyNoRenderErrors();
      expect(await discover.getSavedSearchDocumentCount()).to.be('35 documents');
    });

    it('can edit a by-value session and return to the dashboard', async () => {
      await addSearchEmbeddableToDashboard();
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
          .then((lastBreadcrumb) =>
            expect(lastBreadcrumb).to.be('Editing Rendering Test: saved search')
          ),
        testSubjects
          .exists('unifiedTabs_tabsBar', { timeout: 1000 })
          .then((unifiedTabs) => expect(unifiedTabs).not.to.be(true)),
        discover.isOnDashboardsEditMode().then((editMode) => expect(editMode).to.be(true)),
      ]);
      await queryBar.setQuery('test');
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await discover.clickSaveSearchButton();
      await dashboard.waitForRenderComplete();
      await dashboard.verifyNoRenderErrors();
      expect(await discover.getSavedSearchDocumentCount()).to.be('13 documents');
    });

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

    it('resets back to a normal Discover session if navigated away from an edit session', async () => {
      await addSearchEmbeddableToDashboard();
      await dashboardPanelActions.clickEdit();
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

    it('should apply data, columns and sorting from selected Discover tab', async () => {
      const savedSearchId = 'discover-embeddable-multi-tab-ftr';
      const savedSearchTitle = 'Discover embeddable multi tab';

      await createMultiTabSavedSearch({
        id: savedSearchId,
        title: savedSearchTitle,
      });
      await addSearchEmbeddableToDashboard(savedSearchTitle);
      await testSubjects.existOrFail('discoverEmbeddableTabSelector');

      const initialDocumentCount = await discover.getSavedSearchDocumentCount();
      const initialHeaders = await dataGrid.getHeaderFields();
      const initialFirstCell = await (
        await dataGrid.getCellElementExcludingControlColumns(0, 0)
      ).getVisibleText();

      expect(initialHeaders).to.contain('@timestamp');
      expect(initialHeaders).to.contain('agent');

      await selectEmbeddableTab('filtered-tab', 'Filtered tab');

      const switchedDocumentCount = await discover.getSavedSearchDocumentCount();
      const switchedHeaders = await dataGrid.getHeaderFields();
      const firstBytesCell = await (
        await dataGrid.getCellElementByColumnName(0, 'bytes')
      ).getVisibleText();
      const secondBytesCell = await (
        await dataGrid.getCellElementByColumnName(1, 'bytes')
      ).getVisibleText();

      const firstBytesValue = Number(firstBytesCell.replace(/,/g, ''));
      const secondBytesValue = Number(secondBytesCell.replace(/,/g, ''));

      expect(switchedDocumentCount).not.to.be(initialDocumentCount);
      expect(switchedHeaders).to.contain('bytes');
      expect(switchedHeaders).to.contain('clientip');
      expect(switchedHeaders.includes('agent')).to.be(false);
      expect(firstBytesCell).not.to.be(initialFirstCell);
      expect(Number.isNaN(firstBytesValue)).to.be(false);
      expect(Number.isNaN(secondBytesValue)).to.be(false);
      expect(firstBytesValue <= secondBytesValue).to.be(true);
    });

    it('should show deleted-tab warning in view and edit modes for editor users and dismiss it by selecting a different tab', async () => {
      const savedSearchId = 'discover-embeddable-deleted-tab-editor-ftr';
      const savedSearchTitle = 'Discover embeddable deleted tab editor';
      const dashboardName = 'Dashboard deleted tab editor';

      await createMultiTabSavedSearch({
        id: savedSearchId,
        title: savedSearchTitle,
      });
      await addSearchEmbeddableToDashboard(savedSearchTitle);
      await selectEmbeddableTab('filtered-tab', 'Filtered tab');

      await dashboard.saveDashboard(dashboardName, {
        saveAsNew: true,
        waitDialogIsClosed: true,
        exitFromEditMode: true,
      });

      await removeFilteredTabFromSavedSearch(savedSearchId);
      await refreshDashboardPage();

      const viewModeCalloutText = await getDeletedTabCalloutText();
      expect(viewModeCalloutText).to.contain('Edit the panel');
      await testSubjects.missingOrFail('discoverEmbeddableTabSelector');
      await testSubjects.missingOrFail('docTable');

      await testSubjects.click('discoverEmbeddableDeletedTabEditPanelLink');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();

      const editModeCalloutText = await getDeletedTabCalloutText();
      const selectorText = await testSubjects.getVisibleText('discoverEmbeddableTabSelector');

      expect(editModeCalloutText).to.contain('Select a different tab');
      expect(selectorText).to.contain('(Deleted tab)');
      await testSubjects.missingOrFail('docTable');

      await selectEmbeddableTab('default-tab', 'Default tab');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      await testSubjects.existOrFail('docTable');
    });
  });
}
