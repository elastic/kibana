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
  const log = getService('log');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const security = getService('security');
  const retry = getService('retry');
  const browser = getService('browser');
  const find = getService('find');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');

  const { common, discover, dashboard, header, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'dashboard',
    'header',
    'timePicker',
    'unifiedFieldList',
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
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
          const text = await cell.getVisibleText();
          return text === '1,623';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields'
        );

        await dataGrid.clickDocSortDesc('bytes', 'Sort High-Low');

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the highest value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
          const text = await cell.getVisibleText();
          return text === '17,966';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n1'
        );

        await discover.saveSearch(savedSearchName);

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the same highest value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
          const text = await cell.getVisibleText();
          return text === '17,966';
        });

        await browser.refresh();

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the same highest value after reload', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
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
            const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
            const text = await cell.getVisibleText();
            return text === '17,966';
          }
        );

        await dataGrid.clickDocSortDesc('bytes', 'Sort Low-High');

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the lowest value', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
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
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
          const text = await cell.getVisibleText();
          return text === 'css';
        });

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n2'
        );

        await browser.refresh();

        await discover.waitUntilTabIsLoaded();

        await retry.waitFor('first cell contains the same lowest value after reload', async () => {
          const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
          const text = await cell.getVisibleText();
          return text === '0';
        });

        await retry.waitFor(
          'first cell contains the same lowest value for extension after reload',
          async () => {
            const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
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
            const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
            const text = await cell.getVisibleText();
            return text === '0';
          }
        );

        await retry.waitFor(
          'first cell contains the lowest value for extension as dashboard panel',
          async () => {
            const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
            const text = await cell.getVisibleText();
            return text === 'css';
          }
        );

        expect(await testSubjects.getVisibleText('dataGridColumnSortingButton')).to.be(
          'Sort fields\n2'
        );
      });

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

    describe('filtering by clicking on the table in Discover', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await timePicker.setDefaultAbsoluteRange();
        await discover.waitUntilTabIsLoaded();
      });

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
