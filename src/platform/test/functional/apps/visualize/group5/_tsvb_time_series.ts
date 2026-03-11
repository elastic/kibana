/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visualBuilder, timeToVisualize, dashboard, common, visChart } = getPageObjects(
    ['visualBuilder', 'visualize', 'timeToVisualize', 'dashboard', 'header', 'common', 'visChart']
  );
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const elasticChart = getService('elasticChart');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  describe('visual builder', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles([
        'kibana_admin',
        'long_window_logstash',
        'test_logstash_reader',
      ]);
      await visualize.initTests();
    });
    beforeEach(async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisualBuilder();
      await visualBuilder.checkVisualBuilderIsPresent();
    });

    describe('Time Series', () => {
      beforeEach(async () => {
        await visualBuilder.setTime();
        await visualBuilder.clickPanelOptions('timeSeries');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('timeSeries');
      });

      describe('basics', function () {
        this.tags('includeFirefox');

        it('should render all necessary components', async () => {
          await visualBuilder.checkTimeSeriesChartIsPresent();
          await visualBuilder.checkTimeSeriesLegendIsPresent();
        });

        it('should show the correct count in the legend', async () => {
          await retry.try(async () => {
            const actualCount = await visualBuilder.getRhythmChartLegendValue();
            expect(actualCount).to.be('156');
          });
        });

        it('should show the correct count in the legend with 2h offset', async () => {
          await visualBuilder.clickSeriesOption();
          await visualBuilder.enterOffsetSeries('2h');
          const actualCount = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCount).to.be('293');
        });

        it('should show the correct count in the legend with -2h offset', async () => {
          await visualBuilder.clickSeriesOption();
          await visualBuilder.enterOffsetSeries('-2h');
          const actualCount = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCount).to.be('53');
        });

        it('should open color picker, deactivate panel and clone series', async () => {
          await visualBuilder.clickColorPicker();
          await visualBuilder.checkColorPickerPopUpIsPresent();
          await visualBuilder.clickColorPicker();

          await visualBuilder.changePanelPreview();
          await visualBuilder.checkPreviewIsDisabled();
          await visualBuilder.changePanelPreview();

          await visualBuilder.cloneSeries();
          const legend = await visualBuilder.getLegendItems();
          const series = await visualBuilder.getSeries();
          expect(legend.length).to.be(2);
          expect(series.length).to.be(2);
        });

        it('should show the correct count in the legend with custom numeric formatter', async () => {
          const expectedLegendValue = '$ 156';

          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('number');
          await visualBuilder.enterSeriesTemplate('$ {{value}}');
          await retry.try(async () => {
            const actualCount = await visualBuilder.getRhythmChartLegendValue();
            expect(actualCount).to.be(expectedLegendValue);
          });
        });

        it('should show the correct count in the legend with percent formatter', async () => {
          const expectedLegendValue = '15,600%';

          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('percent');
          const actualCount = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCount).to.be(expectedLegendValue);
        });

        it('should show the correct count in the legend with bytes formatter', async () => {
          const expectedLegendValue = '156B';

          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('bytes');
          const actualCount = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCount).to.be(expectedLegendValue);
        });

        it('should show the correct count in the legend with "Human readable" duration formatter', async () => {
          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('duration');
          await visualBuilder.setDurationFormatterSettings({ to: 'Human readable' });
          const actualCountDefault = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCountDefault).to.be('a few seconds');

          log.debug(`to: 'Human readable', from: 'Seconds'`);
          await visualBuilder.setDurationFormatterSettings({
            to: 'Human readable',
            from: 'Seconds',
          });
          const actualCountSec = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCountSec).to.be('3 minutes');

          log.debug(`to: 'Human readable', from: 'Minutes'`);
          await visualBuilder.setDurationFormatterSettings({
            to: 'Human readable',
            from: 'Minutes',
          });
          const actualCountMin = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCountMin).to.be('3 hours');
        });

        describe('Dark mode', () => {
          before(async () => {
            await kibanaServer.uiSettings.update({
              'theme:darkMode': true,
            });
          });

          it(`viz should have light class when background color is white`, async () => {
            await visualBuilder.clickPanelOptions('timeSeries');
            await visualBuilder.setBackgroundColor('#FFFFFF');
            await retry.try(async () => {
              expect(await visualBuilder.checkTimeSeriesIsLight()).to.be(true);
            });
          });

          after(async () => {
            await kibanaServer.uiSettings.update({
              'theme:darkMode': false,
            });
          });
        });

        describe('Clicking on the chart', function () {
          this.tags('skipFirefox');
          const act = async (visName: string, clickCoordinates: { x: number; y: number }) => {
            await testSubjects.click('visualizeSaveButton');

            await timeToVisualize.saveFromModal(visName, {
              addToDashboard: 'new',
              saveToLibrary: false,
            });

            await dashboard.waitForRenderComplete();

            await retry.try(async () => {
              const el = await elasticChart.getCanvas();

              await el.clickMouseButton({
                xOffset: clickCoordinates.x,
                yOffset: clickCoordinates.y,
              });
              await common.sleep(1000);
              await testSubjects.existOrFail('applyFiltersPopoverButton');
            });

            await testSubjects.click('applyFiltersPopoverButton');
            await dashboard.waitForRenderComplete();
          };

          const cleanup = async () => {
            const discardDashboardPromptButton = 'discardDashboardPromptButton';
            await dashboard.navigateToApp();
            if (await testSubjects.exists(discardDashboardPromptButton)) {
              await dashboard.clickUnsavedChangesDiscard(discardDashboardPromptButton, true);
            }
          };

          afterEach(async () => {
            await cleanup();
          });

          it(`should create a filter`, async () => {
            await visualBuilder.setMetricsGroupByTerms('machine.os.raw', {
              include: 'win 7',
              exclude: 'ios',
            });
            await act('viz_1', { x: 143, y: 123 });
            const hasMachineRawFilter = await filterBar.hasFilter('machine.os.raw', 'win 7');
            expect(hasMachineRawFilter).to.be(true);
          });

          it('should create a filter for series with multiple split by terms fields one of which has formatting', async () => {
            const expectedFilterPills = ['0, win 7'];
            await visualBuilder.setMetricsGroupByTerms('bytes');
            await visChart.waitForVisualizationRenderingStabilized();
            await visualBuilder.setAnotherGroupByTermsField('machine.os.raw');
            await visChart.waitForVisualizationRenderingStabilized();
            await visualBuilder.clickSeriesOption();
            await visualBuilder.setChartType('Bar');
            await visChart.waitForVisualizationRenderingStabilized();
            await visualBuilder.clickPanelOptions('timeSeries');
            await visualBuilder.setIntervalValue('1w');

            await act('vis_2', { x: -130, y: 10 });

            const filterPills = await filterBar.getFiltersLabel();
            expect(filterPills).to.eql(expectedFilterPills);
          });
        });
      });
    });
  });
}
