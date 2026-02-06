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
  const { discover, unifiedFieldList, unifiedTabs } = getPageObjects([
    'discover',
    'unifiedFieldList',
    'unifiedTabs',
  ]);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const queryBar = getService('queryBar');
  const monacoEditor = getService('monacoEditor');
  const esql = getService('esql');
  const browser = getService('browser');
  const fieldEditor = getService('fieldEditor');
  const find = getService('find');

  describe('tabs restorable state', function () {
    describe('sidebar', function () {
      it('should restore sidebar collapsible state', async function () {
        const expectState = async (state: boolean) => {
          expect(await discover.isSidebarPanelOpen()).to.be(state);
        };
        await expectState(true);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(true);
        await discover.closeSidebar();
        await expectState(false);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(true);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState(false);

        await discover.openSidebar();
      });

      it('should restore sidebar width', async function () {
        const distance = 100;
        const initialWidth = await discover.getSidebarWidth();
        const updatedWidth = initialWidth + distance;
        const expectState = async (state: number) => {
          expect(await discover.getSidebarWidth()).to.be(state);
        };
        await expectState(initialWidth);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(initialWidth);
        await discover.resizeSidebarBy(distance);
        await expectState(updatedWidth);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(initialWidth);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState(updatedWidth);
      });

      it('should restore sidebar filters', async function () {
        const initialCount = 48;
        const expectState = async (state: number) => {
          expect(await unifiedFieldList.getSidebarSectionFieldCount('available')).to.be(state);
        };
        await expectState(initialCount);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(initialCount);
        await unifiedFieldList.findFieldByName('i');
        await retry.try(async () => {
          await expectState(28);
        });

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(initialCount);
        await unifiedFieldList.findFieldByName('e');
        await retry.try(async () => {
          await expectState(42);
        });
        await unifiedFieldList.openSidebarFieldFilter();
        await testSubjects.click('typeFilter-number');
        await unifiedFieldList.closeSidebarFieldFilter();
        await retry.try(async () => {
          await expectState(4);
        });

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(initialCount);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState(28);

        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        await expectState(4);

        await unifiedFieldList.clearFieldSearchInput();
        await unifiedFieldList.clearSidebarFieldFilters();
        await retry.try(async () => {
          await expectState(initialCount);
        });
      });
    });

    describe('sidebar existing fields', function () {
      it('should not fetch existing fields again when returning', async function () {
        const expectState = async () => {
          await unifiedFieldList.waitUntilFieldlistHasCountOfFields(48);
        };
        await expectState();

        await discover.expectFieldsForWildcardRequestCount(1, async () => {
          await unifiedTabs.createNewTab();
          await expectState();
        });

        await discover.expectFieldsForWildcardRequestCount(0, async () => {
          await unifiedTabs.selectTab(0);
          await expectState();
        });

        await discover.expectFieldsForWildcardRequestCount(0, async () => {
          await unifiedTabs.selectTab(1);
          await expectState();
        });

        await discover.expectFieldsForWildcardRequestCount(1, async () => {
          await unifiedTabs.createNewTab();
          await expectState();
        });
      });

      it('should refetch when returning to an edited data view', async function () {
        const initialCount = 48;
        const countAfterEditing = 49;
        const expectState = async (state: number) => {
          await unifiedFieldList.waitUntilSidebarHasLoaded();
          await unifiedFieldList.waitUntilFieldlistHasCountOfFields(state);
        };
        await expectState(initialCount);
        const expectField = async (fieldName: string, exists: boolean) => {
          await unifiedFieldList.waitUntilSidebarHasLoaded();
          const availableFields = await unifiedFieldList.getSidebarSectionFieldNames('available');
          expect(availableFields.includes(fieldName)).to.be(exists);
        };

        await discover.expectFieldsForWildcardRequestCount(1, async () => {
          await unifiedTabs.createNewTab();
          await expectState(initialCount);
        });

        const field = '_test';
        const field2 = '_test2';
        await discover.expectFieldsForWildcardRequestCount(1, async () => {
          await discover.addRuntimeField(field, `emit('test')`);
          await discover.waitUntilTabIsLoaded();
          await expectState(countAfterEditing);
          await expectField(field, true);
        });

        await discover.expectFieldsForWildcardRequestCount(1, async () => {
          await unifiedTabs.selectTab(0);
          await expectState(countAfterEditing);
          await expectField(field, true);
        });

        await discover.expectFieldsForWildcardRequestCount(0, async () => {
          await unifiedTabs.selectTab(1);
          await expectState(countAfterEditing);
          await expectField(field, true);
        });

        await discover.expectFieldsForWildcardRequestCount(1, async () => {
          await discover.editField(field);
          await fieldEditor.setName(field2, true);
          await fieldEditor.save();
          await fieldEditor.confirmSave();
          await fieldEditor.waitUntilClosed();
          await discover.waitUntilTabIsLoaded();
          await expectState(countAfterEditing);
          await expectField(field, false);
          await expectField(field2, true);
        });

        await discover.expectFieldsForWildcardRequestCount(1, async () => {
          await unifiedTabs.selectTab(0);
          await expectState(countAfterEditing);
          await expectField(field, false);
          await expectField(field2, true);
        });
      });
    });

    describe('data grid', function () {
      afterEach(async () => {
        await browser.clearLocalStorage();
      });

      it('should restore the selected docs', async () => {
        const expectState = async (count: number) => {
          expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(count);
          expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(count > 0);
        };

        await expectState(0);

        await dataGrid.selectRow(1);
        await dataGrid.selectRow(3);
        await expectState(2);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(0);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(2);
      });

      it('should restore density setting', async () => {
        const expectState = async (density: string) => {
          await retry.try(async () => {
            expect(await dataGrid.getCurrentDensityValue()).to.be(density);
          });
        };

        await dataGrid.clickGridSettings();
        await expectState('Compact');

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await dataGrid.clickGridSettings();
        await dataGrid.changeDensityValue('Normal');
        await expectState('Normal');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await dataGrid.clickGridSettings();
        await expectState('Compact');

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await dataGrid.clickGridSettings();
        await expectState('Normal');
      });

      it('should restore row height setting', async () => {
        const expectState = async (rowHeightValue: string) => {
          await retry.try(async () => {
            expect(await dataGrid.getCurrentRowHeightValue('row')).to.be(rowHeightValue);
          });
        };

        await dataGrid.clickGridSettings();
        await expectState('Custom');

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await dataGrid.clickGridSettings();
        await dataGrid.changeRowHeightValue('Auto');
        await expectState('Auto');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await dataGrid.clickGridSettings();
        await expectState('Custom');

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await dataGrid.clickGridSettings();
        await expectState('Auto');
      });

      it('should restore in-table search', async () => {
        expect(await dataGrid.getCurrentPageNumber()).to.be('1');

        const searchTerm = 'Sep 22, 2015 @ 18:16:13.025';
        const updatedActiveMatch = '2/3';
        await dataGrid.runInTableSearch(searchTerm);
        await dataGrid.goToNextInTableSearchMatch();
        await retry.try(async () => {
          expect(await dataGrid.getInTableSearchTerm()).to.be(searchTerm);
          expect(await dataGrid.getInTableSearchMatchesCounter()).to.be(updatedActiveMatch);
          expect(await dataGrid.getCurrentPageNumber()).to.be('3');
        });

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        expect(await dataGrid.getInTableSearchTerm()).to.be(null);
        expect(await dataGrid.getCurrentPageNumber()).to.be('1');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await retry.try(async () => {
          expect(await dataGrid.getInTableSearchTerm()).to.be(searchTerm);
          expect(await dataGrid.getInTableSearchMatchesCounter()).to.be(updatedActiveMatch);
          expect(await dataGrid.getCurrentPageNumber()).to.be('3');
        });

        await dataGrid.exitInTableSearch();
        await retry.try(async () => {
          expect(await dataGrid.getInTableSearchTerm()).to.be(null);
          expect(await dataGrid.getCurrentPageNumber()).to.be('3');
        });
      });

      it('should restore the comparison mode', async () => {
        const expectState = async (state: boolean, diffMode?: string) => {
          await retry.try(async () => {
            expect(await dataGrid.isComparisonModeActive()).to.be(state);
            if (state && diffMode) {
              expect(await dataGrid.getComparisonDiffMode()).to.be(diffMode);
            }
          });
        };

        await expectState(false);

        await dataGrid.selectRow(1);
        await dataGrid.selectRow(3);
        await dataGrid.clickCompareSelectedButton();
        await expectState(true, 'Full value');
        await dataGrid.selectComparisonDiffMode('words');
        await expectState(true, 'By word');

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(false);
        await dataGrid.selectRow(1);
        await dataGrid.selectRow(2);
        await dataGrid.clickCompareSelectedButton();
        await expectState(true, 'By word');
        await dataGrid.selectComparisonDiffMode('lines');
        await expectState(true, 'By line');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(true, 'By word');

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState(true, 'By line');
      });
    });

    describe('search bar', function () {
      it('should restore the search bar state', async () => {
        const expectState = async (query: string, isDirty: boolean) => {
          await retry.try(async () => {
            expect(await queryBar.getQueryString()).to.be(query);
          });
          expect(await testSubjects.getAttribute('querySubmitButton', 'aria-label')).to.be(
            isDirty ? 'Needs updating' : 'Refresh query'
          );
        };

        const draftQuery0 = 'jpg';
        await expectState('', false);
        await queryBar.setQuery(draftQuery0);
        await expectState(draftQuery0, true);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState('', false);

        const draftQuery2 = 'png';
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState('', false);
        await queryBar.setQuery(draftQuery2);
        await expectState(draftQuery2, true);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery0, true);
        expect(await discover.getHitCount()).to.be('14,004');
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery0, false);
        expect(await discover.getHitCount()).to.be('11,829');

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState('', false);
        expect(await discover.getHitCount()).to.be('14,004');

        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery2, true);
        expect(await discover.getHitCount()).to.be('14,004');
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery2, false);
        expect(await discover.getHitCount()).to.be('1,373');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery0, false);
        expect(await discover.getHitCount()).to.be('11,829');
      });

      it('should restore the search bar state in ES|QL mode', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const defaultQuery = 'FROM logstash-*';

        const expectState = async (query: string, isDirty: boolean) => {
          await retry.try(async () => {
            expect(await monacoEditor.getCodeEditorValue()).to.be(query);
          });
          expect(await testSubjects.getAttribute('querySubmitButton', 'aria-label')).to.be(
            isDirty ? 'Run query' : 'Refresh query'
          );
        };

        const draftQuery0 = 'from logstash-* | sort @timestamp desc | limit 50';
        await expectState(defaultQuery, false);
        await monacoEditor.setCodeEditorValue(draftQuery0);
        await expectState(draftQuery0, true);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(defaultQuery, false);

        const draftQuery2 = 'from logstash-* | sort @timestamp desc | limit 150';
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(defaultQuery, false);
        await monacoEditor.setCodeEditorValue(draftQuery2);
        await expectState(draftQuery2, true);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery0, true);
        expect(await discover.getHitCount()).to.be('1,000');
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery0, false);
        expect(await discover.getHitCount()).to.be('50');

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState(defaultQuery, false);
        expect(await discover.getHitCount()).to.be('1,000');

        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery2, true);
        expect(await discover.getHitCount()).to.be('1,000');
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery2, false);
        expect(await discover.getHitCount()).to.be('150');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery0, false);
        expect(await discover.getHitCount()).to.be('50');
      });

      it('should restore the search bar state also after running the updated query', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        const defaultQuery = 'FROM logstash-*';

        const expectState = async (query: string, isDirty: boolean) => {
          await retry.try(async () => {
            expect(await monacoEditor.getCodeEditorValue()).to.be(query);
          });
          expect(await testSubjects.getAttribute('querySubmitButton', 'aria-label')).to.be(
            isDirty ? 'Run query' : 'Refresh query'
          );
        };

        const draftQuery0 =
          'from logstash-* | sort @timestamp desc | limit 50 // edit and run this';
        await expectState(defaultQuery, false);
        await monacoEditor.setCodeEditorValue(draftQuery0);
        await expectState(draftQuery0, true);
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery0, false);
        expect(await discover.getHitCount()).to.be('50');

        const draftQuery1 = 'from logstash-* | sort @timestamp desc | limit 150 // only edit this';
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(defaultQuery, false);
        await monacoEditor.setCodeEditorValue(draftQuery1);
        await expectState(draftQuery1, true);
        expect(await discover.getHitCount()).to.be('1,000');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery0, false);
        expect(await discover.getHitCount()).to.be('50');

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState(draftQuery1, true);
        expect(await discover.getHitCount()).to.be('1,000');
      });

      it('should restore ES|QL editor state', async () => {
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();

        const distance = 100;
        const initialHeight = await esql.getEditorHeight();
        const updatedHeight = initialHeight + distance;

        const expectState = async (isHistoryPanelOpen: boolean, editorHeight: number) => {
          await retry.try(async () => {
            expect(await esql.isHistoryPanelOpen()).to.be(isHistoryPanelOpen);
          });
          expect(await esql.getEditorHeight()).to.be(editorHeight);
        };

        await expectState(false, initialHeight);
        await esql.toggleHistoryPanel();
        await expectState(true, initialHeight);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(false, initialHeight);
        await esql.resizeEditorBy(distance);
        await expectState(false, updatedHeight);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(true, initialHeight);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState(false, updatedHeight);
      });
    });

    describe('restorable, tab scoped state', function () {
      afterEach(async () => {
        await browser.clearLocalStorage();
      });

      describe('classic view', () => {
        it('should restore state for searchValue, pinnedFields when switching tabs', async () => {
          /* Tab 1 settings: 
          // searchValue: "geo", 
          // pinnedFields: ["geo.src"], 
          */
          await dataGrid.clickRowToggle();
          await discover.isShowingDocViewer();
          await retry.waitFor('rendered items', async () => {
            return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
          });

          // searchValue
          await discover.findFieldByNameOrValueInDocViewer('geo');
          await retry.waitFor('first tab filtered fields', async () => {
            return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
          });

          // pinnedFields
          await dataGrid.togglePinActionInFlyout('geo.src');
          expect(await dataGrid.isFieldPinnedInFlyout('geo.src')).to.be(true);

          /* Tab 2 settings: 
          // searchValue: ".sr", 
          // pinnedFields: ["geo.srcdest"], 
          // showOnlySelectedFields toggle on
          */
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();

          await dataGrid.clickRowToggle();
          await discover.isShowingDocViewer();

          // searchValue
          await discover.findFieldByNameOrValueInDocViewer('.sr');
          await retry.waitFor('second tab filtered fields', async () => {
            return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
          });

          // pinnedFields
          await dataGrid.togglePinActionInFlyout('geo.src');
          await dataGrid.togglePinActionInFlyout('geo.srcdest');
          expect(await dataGrid.isFieldPinnedInFlyout('geo.src')).to.be(false);
          expect(await dataGrid.isFieldPinnedInFlyout('geo.srcdest')).to.be(true);

          // Switch back to tab 1 and verify all state is restored and scoped to the tab
          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();

          // searchValue
          const searchInput = await testSubjects.find('unifiedDocViewerFieldsSearchInput');
          expect(await searchInput.getAttribute('value')).to.be('geo');
          expect((await find.allByCssSelector('.kbnDocViewer__fieldName')).length).to.be(4);

          // pinnedFields
          expect(await dataGrid.isFieldPinnedInFlyout('geo.src')).to.be(true);
        });

        it('should restore state for fieldTypeFilters, showSelectedOnly when switching tabs', async () => {
          /* Tab 1 settings: 
          // fieldTypeFilters: date, 
          // showSelectedOnly toggle off, 
          */
          await dataGrid.clickRowToggle();
          await discover.isShowingDocViewer();
          await retry.waitFor('rendered items', async () => {
            return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
          });

          // fieldTypeFilters
          await discover.openFilterByFieldTypeInDocViewer();
          await testSubjects.click('typeFilter-date');
          const dateFilter = await testSubjects.find('typeFilter-date');
          expect(await dateFilter.getAttribute('aria-checked')).to.be('true');
          await discover.closeFilterByFieldTypeInDocViewer();
          const filterToggleTab1 = await testSubjects.find(
            'unifiedDocViewerFieldsTableFieldTypeFilterToggle'
          );
          expect(await filterToggleTab1.getVisibleText()).to.be('1');

          // showOnlySelectedFields
          await unifiedFieldList.clickFieldListItemAdd('utc_time');
          await discover.waitUntilTabIsLoaded();

          const showOnlySelectedFieldsSwitchTab1 = await testSubjects.find(
            'unifiedDocViewerShowOnlySelectedFieldsSwitch'
          );
          expect(await showOnlySelectedFieldsSwitchTab1.getAttribute('aria-checked')).to.be(
            'false'
          );

          /* Tab 2 settings: 
          // fieldTypeFilters: number, 
          // showSelectedOnly toggle on,
          */
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();

          await dataGrid.clickRowToggle();
          await discover.isShowingDocViewer();

          await retry.waitFor('rendered items', async () => {
            return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
          });

          // fieldTypeFilters
          await discover.openFilterByFieldTypeInDocViewer();
          await testSubjects.click('typeFilter-number');
          const numberFilter = await testSubjects.find('typeFilter-number');
          expect(await numberFilter.getAttribute('aria-checked')).to.be('true');
          await discover.closeFilterByFieldTypeInDocViewer();
          const filterToggleTab2 = await testSubjects.find(
            'unifiedDocViewerFieldsTableFieldTypeFilterToggle'
          );
          expect(await filterToggleTab2.getVisibleText()).to.be('2');

          // showOnlySelectedFields
          await unifiedFieldList.clickFieldListItemAdd('utc_time');
          await discover.waitUntilTabIsLoaded();

          const showOnlySelectedFieldsSwitchTab2 = await testSubjects.find(
            'unifiedDocViewerShowOnlySelectedFieldsSwitch'
          );
          expect(await showOnlySelectedFieldsSwitchTab2.getAttribute('aria-checked')).to.be(
            'false'
          );
          await showOnlySelectedFieldsSwitchTab2.click();
          expect(await showOnlySelectedFieldsSwitchTab2.getAttribute('aria-checked')).to.be('true');

          // Switch back to tab 1 and verify all state is restored and scoped to the tab
          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();

          const filterToggleTab1AfterSwitch = await testSubjects.find(
            'unifiedDocViewerFieldsTableFieldTypeFilterToggle'
          );
          expect(await filterToggleTab1AfterSwitch.getVisibleText()).to.be('1');

          // showOnlySelectedFields
          const showOnlySelectedFieldsSwitchTab1AfterSwitch = await testSubjects.find(
            'unifiedDocViewerShowOnlySelectedFieldsSwitch'
          );
          expect(
            await showOnlySelectedFieldsSwitchTab1AfterSwitch.getAttribute('aria-checked')
          ).to.be('false');
        });

        it('should restore state for rowsPerPage and pageNumber when switching tabs', async () => {
          /* Tab 1 settings: 
          // rowsPerPage: 50, 
          // pageNumber 1, 
          */
          await dataGrid.clickRowToggle();
          await discover.isShowingDocViewer();
          await retry.waitFor('rendered items', async () => {
            return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
          });

          // rowsPerPage
          const docViewerTable = await testSubjects.find('UnifiedDocViewerTableGrid');
          const paginationButton1 = await docViewerTable.findByTestSubject(
            'tablePaginationPopoverButton'
          );
          await paginationButton1.click();
          await testSubjects.click('tablePagination-50-rows');
          await retry.waitFor('rows per page to be 50', async () => {
            const button = await docViewerTable.findByTestSubject('tablePaginationPopoverButton');
            return (await button.getVisibleText()) === 'Rows per page: 50';
          });

          // pageNumber
          const currentPage1 = await docViewerTable.findByCssSelector(
            '.euiPaginationButton[aria-current="page"]'
          );
          expect(await currentPage1.getVisibleText()).to.be('1');

          /* Tab 2 settings: 
          // rowsPerPage: 25, 
          // pageNumber 2, 
          */
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();

          await dataGrid.clickRowToggle();
          await discover.isShowingDocViewer();

          await retry.waitFor('rendered items', async () => {
            return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
          });

          // rowsPerPage
          const docViewerTable2 = await testSubjects.find('UnifiedDocViewerTableGrid');
          const paginationButton2 = await docViewerTable2.findByTestSubject(
            'tablePaginationPopoverButton'
          );
          await paginationButton2.click();
          await testSubjects.click('tablePagination-25-rows');
          await retry.waitFor('rows per page to be 25', async () => {
            const button = await docViewerTable2.findByTestSubject('tablePaginationPopoverButton');
            return (await button.getVisibleText()) === 'Rows per page: 25';
          });

          // pageNumber
          const page2Button = await docViewerTable2.findByTestSubject('pagination-button-1');
          await page2Button.click();
          await retry.waitFor('page 2 to be active', async () => {
            const currentPage = await docViewerTable2.findByCssSelector(
              '.euiPaginationButton[aria-current="page"]'
            );
            return (await currentPage.getVisibleText()) === '2';
          });

          // Switch back to tab 1 and verify all state is restored and scoped to the tab
          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();

          // rowsPerPage
          const docViewerTable1AfterSwitch = await testSubjects.find('UnifiedDocViewerTableGrid');
          await retry.waitFor('rows per page to be 50 after switch', async () => {
            const button = await docViewerTable1AfterSwitch.findByTestSubject(
              'tablePaginationPopoverButton'
            );
            return (await button.getVisibleText()) === 'Rows per page: 50';
          });

          // pageNumber
          const currentPage1AfterSwitch = await docViewerTable1AfterSwitch.findByCssSelector(
            '.euiPaginationButton[aria-current="page"]'
          );
          expect(await currentPage1AfterSwitch.getVisibleText()).to.be('1');
        });
      });

      describe('ES|QL view', () => {
        it('should restore state for hideNullValues', async () => {
          /* Tab 1 settings: 
          // hideNullValues toggle off,
          */
          await discover.selectTextBaseLang();
          await discover.waitUntilTabIsLoaded();
          await unifiedFieldList.waitUntilSidebarHasLoaded();

          await dataGrid.clickRowToggle();
          await discover.isShowingDocViewer();

          // hideNullValues
          const hideNullValuesSwitchTab1 = await testSubjects.find(
            'unifiedDocViewerHideNullValuesSwitch'
          );
          expect(await hideNullValuesSwitchTab1.getAttribute('aria-checked')).to.be('false');

          /* Tab 2 settings: 
          // hideNullValues toggle on,
          */
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();

          await dataGrid.clickRowToggle();
          await discover.isShowingDocViewer();

          // hideNullValues
          const hideNullValuesSwitchTab2 = await testSubjects.find(
            'unifiedDocViewerHideNullValuesSwitch'
          );
          expect(await hideNullValuesSwitchTab2.getAttribute('aria-checked')).to.be('false');
          await hideNullValuesSwitchTab2.click();
          expect(await hideNullValuesSwitchTab2.getAttribute('aria-checked')).to.be('true');

          // Switch back to tab 1 and verify all state is restored and scoped to the tab
          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();

          // hideNullValues
          const hideNullValuesSwitchTab1AfterSwitch = await testSubjects.find(
            'unifiedDocViewerHideNullValuesSwitch'
          );
          expect(await hideNullValuesSwitchTab1AfterSwitch.getAttribute('aria-checked')).to.be(
            'false'
          );
        });
      });
    });
  });
}
