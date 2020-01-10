/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import { vislibPointSeriesTypes as pointSeriesConfig } from '../../../lib/types/point_series';
import percentileTestdata from './testdata_linechart_percentile.json';
import percentileTestdataResult from './testdata_linechart_percentile_result.json';

describe('Point Series Config Type Class Test Suite', function() {
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

  const data = {
    get: prop => {
      return data[prop] || data.data[prop] || null;
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

  beforeEach(ngMock.module('kibana'));

  describe('histogram chart', function() {
    beforeEach(function() {
      parsedConfig = pointSeriesConfig.column(histogramConfig, data);
    });
    it('should not throw an error when more than 25 series are provided', function() {
      expect(parsedConfig.error).to.be.undefined;
    });

    it('should set axis title and formatter from data', () => {
      expect(parsedConfig.categoryAxes[0].title.text).to.equal(data.data.xAxisLabel);
      expect(parsedConfig.valueAxes[0].labels.axisFormatter).to.not.be.undefined;
    });
  });

  describe('line chart', function() {
    beforeEach(function() {
      const percentileDataObj = {
        get: prop => {
          return data[prop] || data.data[prop] || null;
        },
        getLabels: () => [],
        data: percentileTestdata.data,
      };
      parsedConfig = pointSeriesConfig.line(percentileTestdata.cfg, percentileDataObj);
    });
    it('should render a percentile line chart', function() {
      expect(JSON.stringify(parsedConfig)).to.eql(JSON.stringify(percentileTestdataResult));
    });
  });
});
