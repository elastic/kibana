/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import stackedSeries from '../../../fixtures/mock_data/date_histogram/_stacked_series';
import { vislibPointSeriesTypes } from './point_series';
import percentileTestdata from './testdata_linechart_percentile.json';
import percentileTestdataResult from './testdata_linechart_percentile_result.json';
import percentileTestdataFloatValue from './testdata_linechart_percentile_float_value.json';
import percentileTestdataFloatValueResult from './testdata_linechart_percentile_float_value_result.json';

const maxBucketData = {
  get: (prop) => {
    return maxBucketData[prop] || maxBucketData.data[prop] || null;
  },
  getLabels: () => [],
  data: {
    hits: 621,
    ordered: {
      date: true,
      interval: 30000,
      max: 1408734982458,
      min: 1408734082458,
    },
    series: [
      { label: 's1', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's2', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's3', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's4', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's5', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's6', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's7', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's8', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's9', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's10', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's11', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's12', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's13', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's14', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's15', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's16', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's17', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's18', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's19', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's20', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's21', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's22', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's23', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's24', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's25', values: [{ x: 1408734060000, y: 8 }] },
      { label: 's26', values: [{ x: 1408734060000, y: 8 }] },
    ],
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'series',
    yAxisFormatter: () => 'test',
  },
};

describe('vislibPointSeriesTypes', () => {
  const heatmapConfig = {
    type: 'heatmap',
    addLegend: true,
    addTooltip: true,
    colorsNumber: 4,
    colorSchema: 'Greens',
    setColorRange: false,
    percentageMode: true,
    invertColors: false,
    colorsRange: [],
    heatmapMaxBuckets: 20,
  };

  const stackedData = {
    get: (prop) => {
      return stackedSeries[prop] || null;
    },
    getLabels: () => [],
    data: stackedSeries,
  };

  describe('axis formatters', () => {
    it('should create a value axis config with the default y axis formatter', () => {
      const parsedConfig = vislibPointSeriesTypes.line({}, maxBucketData);
      expect(parsedConfig.valueAxes.length).toEqual(1);
      expect(parsedConfig.valueAxes[0].labels.axisFormatter).toBe(
        maxBucketData.data.yAxisFormatter
      );
    });

    it('should use the formatter of the first series matching the axis if there is a descriptor', () => {
      const axisFormatter1 = jest.fn();
      const axisFormatter2 = jest.fn();
      const axisFormatter3 = jest.fn();
      const parsedConfig = vislibPointSeriesTypes.line(
        {
          valueAxes: [
            {
              id: 'ValueAxis-1',
              labels: {},
            },
            {
              id: 'ValueAxis-2',
              labels: {},
            },
          ],
          seriesParams: [
            {
              valueAxis: 'ValueAxis-1',
              data: {
                id: '2',
              },
            },
            {
              valueAxis: 'ValueAxis-2',
              data: {
                id: '3',
              },
            },
            {
              valueAxis: 'ValueAxis-2',
              data: {
                id: '4',
              },
            },
          ],
        },
        {
          ...maxBucketData,
          data: {
            ...maxBucketData.data,
            series: [
              { id: '2.1', label: 's1', values: [], yAxisFormatter: axisFormatter1 },
              { id: '2.2', label: 's2', values: [], yAxisFormatter: axisFormatter1 },
              { id: '3.1', label: 's3', values: [], yAxisFormatter: axisFormatter2 },
              { id: '3.2', label: 's4', values: [], yAxisFormatter: axisFormatter2 },
              { id: '4.1', label: 's5', values: [], yAxisFormatter: axisFormatter3 },
              { id: '4.2', label: 's6', values: [], yAxisFormatter: axisFormatter3 },
            ],
          },
        }
      );
      expect(parsedConfig.valueAxes.length).toEqual(2);
      expect(parsedConfig.valueAxes[0].labels.axisFormatter).toBe(axisFormatter1);
      expect(parsedConfig.valueAxes[1].labels.axisFormatter).toBe(axisFormatter2);
    });
  });

  describe('heatmap()', () => {
    it('should return an error when more than 20 series are provided', () => {
      const parsedConfig = vislibPointSeriesTypes.heatmap(heatmapConfig, maxBucketData);
      expect(parsedConfig.error).toMatchInlineSnapshot(
        `"There are too many series defined (26). The configured maximum is 20."`
      );
    });

    it('should return valid config when less than 20 series are provided', () => {
      const parsedConfig = vislibPointSeriesTypes.heatmap(heatmapConfig, stackedData);
      expect(parsedConfig.error).toBeUndefined();
      expect(parsedConfig.valueAxes[0].show).toBeFalsy();
      expect(parsedConfig.categoryAxes.length).toBe(2);
      expect(parsedConfig.error).toBeUndefined();
    });
  });
});

describe('Point Series Config Type Class Test Suite', function () {
  let parsedConfig;
  const histogramConfig = {
    type: 'histogram',
    addLegend: true,
    tooltip: {
      show: true,
    },
    categoryAxes: [
      {
        id: 'CategoryAxis-1',
        type: 'category',
        title: {},
      },
    ],
    valueAxes: [
      {
        id: 'ValueAxis-1',
        type: 'value',
        labels: {},
        title: {},
      },
    ],
  };

  describe('histogram chart', function () {
    beforeEach(function () {
      parsedConfig = vislibPointSeriesTypes.column(histogramConfig, maxBucketData);
    });
    it('should not throw an error when more than 25 series are provided', function () {
      expect(parsedConfig.error).toBeUndefined();
    });

    it('should set axis title and formatter from data', () => {
      expect(parsedConfig.categoryAxes[0].title.text).toEqual(maxBucketData.data.xAxisLabel);
      expect(parsedConfig.valueAxes[0].labels.axisFormatter).toBeDefined();
    });
  });

  describe('line chart', function () {
    function prepareData({ cfg, data }) {
      const percentileDataObj = {
        get: (prop) => {
          return maxBucketData[prop] || maxBucketData.data[prop] || null;
        },
        getLabels: () => [],
        data: data,
      };
      const parsedConfig = vislibPointSeriesTypes.line(cfg, percentileDataObj);
      return parsedConfig;
    }

    it('should render a percentile line chart', function () {
      const parsedConfig = prepareData(percentileTestdata);
      expect(parsedConfig).toMatchObject(percentileTestdataResult);
    });

    it('should render a percentile line chart when value is float', function () {
      const parsedConfig = prepareData(percentileTestdataFloatValue);
      expect(parsedConfig).toMatchObject(percentileTestdataFloatValueResult);
    });
  });
});
