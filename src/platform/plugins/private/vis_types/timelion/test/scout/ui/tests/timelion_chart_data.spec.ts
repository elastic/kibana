/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Timelion visualization - chart data', { tag: tags.ESS_ONLY }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH_FUNCTIONAL);
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LONG_WINDOW_LOGSTASH);
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.VISUALIZE);
    await uiSettings.set({
      defaultIndex: testData.UI_SETTINGS.DEFAULT_INDEX,
      'format:bytes:defaultPattern': testData.UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN,
      'histogram:maxBars': testData.UI_SETTINGS.HISTOGRAM_MAX_BARS,
      'timepicker:timeDefaults': `{ "from": "${testData.DEFAULT_START_TIME_UTC}", "to": "${testData.DEFAULT_END_TIME_UTC}"}`,
    });
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset(
      'defaultIndex',
      'format:bytes:defaultPattern',
      'histogram:maxBars',
      'timepicker:timeDefaults'
    );
    await kbnClient.savedObjects.cleanStandardList();
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.timelion.goto();
  });

  test('should display correct data for specified index pattern and timefield', async ({
    pageObjects,
  }) => {
    const { timelion } = pageObjects;
    await timelion.initVisualization('.es(index=long-window-logstash-*,timefield=@timestamp)');

    const chartData = await timelion.getAreaChartData('q:* > count');
    expect(chartData).toEqual([3, 5, 2, 6, 1, 6, 1, 7, 0, 0]);
  });

  test('should display correct chart colors for multiple expressions', async ({ pageObjects }) => {
    const { timelion } = pageObjects;
    const expectedColors = ['#01A4A4', '#FFCFDF', '#BFA7DA', '#AD7DE6'];
    await timelion.initVisualization(
      '.es(*), .es(*).color("#FFCFDF"), .es(*).color("#BFA7DA"), .es(*).color("#AD7DE6")'
    );

    const colors = await timelion.getAreaColors();
    expect(colors).toEqual(expectedColors);
  });

  test('should display correct chart data for average, min, max and cardinality aggregations', async ({
    pageObjects,
  }) => {
    const { timelion } = pageObjects;
    await timelion.initVisualization(
      '.es(index=logstash-*,metric=avg:bytes), .es(index=logstash-*,metric=min:bytes),' +
        '.es(index=logstash-*,metric=max:bytes,), .es(index=logstash-*,metric=cardinality:bytes)',
      '36h'
    );

    const firstAreaChartData = await timelion.getAreaChartData('q:* > avg(bytes)');
    const secondAreaChartData = await timelion.getAreaChartData('q:* > min(bytes)');
    const thirdAreaChartData = await timelion.getAreaChartData('q:* > max(bytes)');
    const forthAreaChartData = await timelion.getAreaChartData('q:* > cardinality(bytes)');

    expect(firstAreaChartData).toEqual([5732.783676366217, 5721.775973559419]);
    expect(secondAreaChartData).toEqual([0, 0]);
    expect(thirdAreaChartData).toEqual([19985, 19986]);
    expect(forthAreaChartData).toEqual([5019, 4958, 0, 0]);
  });

  test('should display correct chart data for expressions using functions', async ({
    pageObjects,
  }) => {
    const { timelion } = pageObjects;
    const firstAreaExpectedChartData = [3, 2421, 2343, 2294, 2327, 2328, 2312, 7, 0, 0];
    const thirdAreaExpectedChartData = [200, 167, 199, 200, 200, 198, 108, 200, 200];
    const forthAreaExpectedChartData = [150, 50, 50, 50, 50, 50, 50, 150, 150, 150];

    await timelion.initVisualization(
      '.es(*).label("initial"),' +
        '.es(*).add(term=.es(*).multiply(-1).abs()).divide(2).label("add multiply abs divide"),' +
        '.es(q="bytes<100").derivative().sum(200).min(200).label("query derivative min sum"),' +
        '.es(*).if(operator=gt,if=200,then=50,else=150).label("condition")'
    );

    const firstAreaChartData = await timelion.getAreaChartData('initial');
    const secondAreaChartData = await timelion.getAreaChartData('add multiply abs divide');
    const thirdAreaChartData = await timelion.getAreaChartData('query derivative min sum');
    const forthAreaChartData = await timelion.getAreaChartData('condition');

    expect(firstAreaChartData).toEqual(firstAreaExpectedChartData);
    expect(secondAreaChartData).toEqual(firstAreaExpectedChartData);
    expect(thirdAreaChartData).toEqual(thirdAreaExpectedChartData);
    expect(forthAreaChartData).toEqual(forthAreaExpectedChartData);
  });

  test('should display correct chart title, data and labels for expressions with custom labels, yaxis and offset', async ({
    pageObjects,
  }) => {
    const { timelion } = pageObjects;
    const firstAreaExpectedChartData = [13112352443.375292, 13095637741.055172];
    const secondAreaExpectedChartData = [
      [1442642400000, 5732.783676366217],
      [1442772000000, 5721.775973559419],
    ];
    const thirdAreaExpectedChartData = [
      [1442772000000, 5732.783676366217],
      [1442901600000, 5721.775973559419],
    ];

    await timelion.initVisualization(
      '.es(index=logstash*,timefield="@timestamp",metric=avg:machine.ram).label("Average Machine RAM amount").yaxis(2,units=bytes,position=right),' +
        '.es(index=logstash*,timefield="@timestamp",metric=avg:bytes).label("Average Bytes for request").yaxis(1,units=bytes,position=left),' +
        '.es(index=logstash*,timefield="@timestamp",metric=avg:bytes, offset=-12h).label("Average Bytes for request with offset").yaxis(3,units=custom:BYTES_,position=right)',
      '36h'
    );

    const leftAxesCount = await timelion.getAxesCountByPosition('left');
    const rightAxesCount = await timelion.getAxesCountByPosition('right');
    const firstAxesLabels = await timelion.getYAxisLabels(0);
    const secondAxesLabels = await timelion.getYAxisLabels(1);
    const thirdAxesLabels = await timelion.getYAxisLabels(2);
    const firstAreaChartData = await timelion.getAreaChartData('Average Machine RAM amount');
    const secondAreaChartData = await timelion.getAreaChartData('Average Bytes for request', true);
    const thirdAreaChartData = await timelion.getAreaChartData(
      'Average Bytes for request with offset',
      true
    );

    expect(leftAxesCount).toBe(1);
    expect(rightAxesCount).toBe(2);
    expect(firstAreaChartData).toEqual(firstAreaExpectedChartData);
    expect(secondAreaChartData).toEqual(secondAreaExpectedChartData);
    expect(thirdAreaChartData).toEqual(thirdAreaExpectedChartData);
    expect(firstAxesLabels).toEqual(['12.2GB', '12.21GB']);
    expect(secondAxesLabels).toEqual(['5.59KB', '5.6KB']);
    expect(thirdAxesLabels.toString()).toBe(
      'BYTES_5722,BYTES_5724,BYTES_5726,BYTES_5728,BYTES_5730,BYTES_5732'
    );
  });

  test('should display correct chart data for split expression', async ({ pageObjects }) => {
    const { timelion } = pageObjects;
    await timelion.initVisualization('.es(index=logstash-*, split=geo.dest:3)', '1 day');

    const firstAreaChartData = await timelion.getAreaChartData('q:* > geo.dest:CN > count');
    const secondAreaChartData = await timelion.getAreaChartData('q:* > geo.dest:IN > count');
    const thirdAreaChartData = await timelion.getAreaChartData('q:* > geo.dest:US > count');

    expect(firstAreaChartData).toEqual([0, 905, 910, 850, 0]);
    expect(secondAreaChartData).toEqual([0, 763, 699, 825, 0]);
    expect(thirdAreaChartData).toEqual([0, 423, 386, 389, 0]);
  });

  test('should display two areas and one bar chart items', async ({ pageObjects }) => {
    const { timelion } = pageObjects;
    await timelion.initVisualization('.es(*), .es(*), .es(*).bars(stack=true)');

    const areasChartsCount = await timelion.getAreaSeriesCount();
    const barsChartsCount = await timelion.getHistogramSeriesCount();

    expect(areasChartsCount).toBe(2);
    expect(barsChartsCount).toBe(1);
  });
});
