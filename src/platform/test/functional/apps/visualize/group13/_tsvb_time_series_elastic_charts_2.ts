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
  const { visualize, visualBuilder } = getPageObjects(['visualBuilder', 'visualize']);
  const security = getService('security');
  const browser = getService('browser');
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

      describe('Elastic charts', function () {
        this.tags('skipFirefox');
        beforeEach(async () => {
          await visualBuilder.toggleNewChartsLibraryWithDebug(true);
          await visualBuilder.clickPanelOptions('timeSeries');
          await visualBuilder.setIntervalValue('12h');
          await visualBuilder.clickDataTab('timeSeries');
        });

        describe('Hiding series', () => {
          it('should hide series by legend item click', async () => {
            await visualBuilder.clickDataTab('timeSeries');
            await visualBuilder.setMetricsGroupByTerms('@tags.raw');

            let areasCount = (await visualBuilder.getChartItems())?.length;
            expect(areasCount).to.be(6);

            await visualBuilder.clickSeriesLegendItem('success');
            await visualBuilder.clickSeriesLegendItem('info');
            await visualBuilder.clickSeriesLegendItem('error');

            areasCount = (await visualBuilder.getChartItems())?.length;
            expect(areasCount).to.be(3);
          });

          it('should keep series hidden after refresh', async () => {
            await visualBuilder.clickDataTab('timeSeries');
            await visualBuilder.setMetricsGroupByTerms('extension.raw');

            let legendNames = await visualBuilder.getLegendNames();
            expect(legendNames).to.eql(['jpg', 'css', 'png', 'gif', 'php']);

            await visualBuilder.clickSeriesLegendItem('png');
            await visualBuilder.clickSeriesLegendItem('php');
            legendNames = await visualBuilder.getLegendNames();
            expect(legendNames).to.eql(['png', 'php']);

            await visualize.clickRefresh();
            legendNames = await visualBuilder.getLegendNames();
            expect(legendNames).to.eql(['png', 'php']);
          });
        });

        describe('Query filter', () => {
          it('should display correct chart data for applied series filter', async () => {
            const expectedChartData = [
              [1442620800000, 0],
              [1442664000000, 0],
              [1442707200000, 31],
              [1442750400000, 24],
              [1442793600000, 27],
              [1442836800000, 22],
              [1442880000000, 24],
            ];
            await visualBuilder.clickSeriesOption();
            await visualBuilder.setSeriesFilter('machine.os.raw : "win 7" and bytes > 10000');

            const chartData = await visualBuilder.getAreaChartData();
            expect(chartData).to.eql(expectedChartData);
          });

          it('should display correct chart data for applied panel filter', async () => {
            const expectedChartData = [
              [1442620800000, 0],
              [1442664000000, 0],
              [1442707200000, 472],
              [1442750400000, 474],
              [1442793600000, 450],
              [1442836800000, 439],
              [1442880000000, 458],
            ];
            await visualBuilder.clickPanelOptions('timeSeries');
            await visualBuilder.setPanelFilter('machine.os.raw: "ios"');

            const chartData = await visualBuilder.getAreaChartData();
            expect(chartData).to.eql(expectedChartData);
          });
        });

        describe('Annotations', () => {
          beforeEach(async () => {
            await visualBuilder.clickAnnotationsTab();
            await visualBuilder.clickAnnotationsAddDataSourceButton();
          });

          it('should display correct annotations data for extension.raw field', async () => {
            const expectedAnnotationsData = [
              {
                dataValue: 1442743200000,
                details: 'extension: css',
                header: '2015-09-20 10:00',
              },
              {
                dataValue: 1442754000000,
                details: 'extension: jpg',
                header: '2015-09-20 13:00',
              },
              {
                dataValue: 1442818800000,
                details: 'extension: jpg',
                header: '2015-09-21 07:00',
              },
            ];
            await visualBuilder.setAnnotationFilter('geo.dest : "AW" or geo.src : "AM"');
            await visualBuilder.setAnnotationFields('extension.raw');
            await visualBuilder.setAnnotationRowTemplate('extension: {{extension.raw}}');
            const annotationsData = await visualBuilder.getAnnotationsData();
            expect(annotationsData).to.eql(expectedAnnotationsData);
          });
          it('should display correct annotations data for machine.os.raw and memory fields', async () => {
            const expectedAnnotationsData = [
              {
                dataValue: 1442721600000,
                details: 'OS: win 7, memory: 0',
                header: '2015-09-20 04:00',
              },
              {
                dataValue: 1442743200000,
                details: 'OS: win xp, memory: 0',
                header: '2015-09-20 10:00',
              },
              {
                dataValue: 1442772000000,
                details: 'OS: ios, memory: 246280',
                header: '2015-09-20 18:00',
              },
              {
                dataValue: 1442815200000,
                details: 'OS: ios, memory: 0',
                header: '2015-09-21 06:00',
              },
              {
                dataValue: 1442826000000,
                details: 'OS: win 8, memory: 0',
                header: '2015-09-21 09:00',
              },
              {
                dataValue: 1442851200000,
                details: 'OS: win 7, memory: 0',
                header: '2015-09-21 16:00',
              },
            ];
            await visualBuilder.setAnnotationFilter('bytes = 0');
            await visualBuilder.setAnnotationFields('machine.os.raw, memory');
            await visualBuilder.setAnnotationRowTemplate(
              'OS: {{machine.os.raw}}, memory: {{memory}}'
            );
            const annotationsData = await visualBuilder.getAnnotationsData();
            expect(annotationsData).to.eql(expectedAnnotationsData);
          });
          it('should display correct annotations data when using runtime field', async () => {
            const expectedAnnotationsData = [
              {
                dataValue: 1442736000000,
                details: 'hello world from US!',
                header: '2015-09-20 08:00',
              },
              {
                dataValue: 1442746800000,
                details: 'hello world from CN!',
                header: '2015-09-20 11:00',
              },
              {
                dataValue: 1442761200000,
                details: 'hello world from MX!',
                header: '2015-09-20 15:00',
              },
              {
                dataValue: 1442822400000,
                details: 'hello world from IN!',
                header: '2015-09-21 08:00',
              },
              {
                dataValue: 1442826000000,
                details: 'hello world from TH!',
                header: '2015-09-21 09:00',
              },
              {
                dataValue: 1442829600000,
                details: 'hello world from SY!',
                header: '2015-09-21 10:00',
              },
            ];
            await visualBuilder.setAnnotationFilter('memory > 300000 and geo.src: "US"');
            await visualBuilder.setAnnotationFields('hello_world_runtime_field, geo.dest');
            await visualBuilder.setAnnotationRowTemplate(
              '{{hello_world_runtime_field}} from {{geo.dest}}!'
            );

            const annotationsData = await visualBuilder.getAnnotationsData();

            expect(annotationsData).to.eql(expectedAnnotationsData);
          });
        });

        after(async () => await visualBuilder.toggleNewChartsLibraryWithDebug(false));
      });

      describe('index pattern selection mode', function () {
        this.tags('skipFirefox');
        it('should disable switch for Kibana index patterns mode by default', async () => {
          await visualBuilder.clickPanelOptions('timeSeries');
          const isEnabled = await visualBuilder.checkIndexPatternSelectionModeSwitchIsEnabled();
          expect(isEnabled).to.be(false);
        });

        describe('metrics:allowStringIndices = true', () => {
          before(async () => {
            await kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': true });
            await browser.refresh();
          });

          beforeEach(async () => await visualBuilder.clickPanelOptions('timeSeries'));

          it('should not disable switch for Kibana index patterns mode', async () => {
            await visualBuilder.switchIndexPatternSelectionMode(true);

            const isEnabled = await visualBuilder.checkIndexPatternSelectionModeSwitchIsEnabled();
            expect(isEnabled).to.be(true);
          });

          it('should disable switch after selecting Kibana index patterns mode and metrics:allowStringIndices = false', async () => {
            await visualBuilder.switchIndexPatternSelectionMode(false);
            await kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': false });
            await browser.refresh();
            await visualBuilder.clickPanelOptions('timeSeries');

            let isEnabled = await visualBuilder.checkIndexPatternSelectionModeSwitchIsEnabled();
            expect(isEnabled).to.be(true);

            await visualBuilder.switchIndexPatternSelectionMode(true);
            isEnabled = await visualBuilder.checkIndexPatternSelectionModeSwitchIsEnabled();
            expect(isEnabled).to.be(false);
          });

          after(
            async () =>
              await kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': false })
          );
        });
      });
    });
  });
}
