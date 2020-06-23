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

import _ from 'lodash';
import { initYAxis } from './_init_y_axis';
import { Chart } from './point_series';

describe('initYAxis', function () {
  const baseChart = {
    aspects: {
      y: [
        { title: 'y1', format: {} },
        { title: 'y2', format: {} },
      ],
      x: [
        {
          title: 'x',
        },
      ],
    },
  } as Chart;

  describe('with a single y aspect', function () {
    const singleYBaseChart = _.cloneDeep(baseChart);
    singleYBaseChart.aspects.y = [singleYBaseChart.aspects.y[0]];

    it('sets the yAxisFormatter the the field formats convert fn', function () {
      const chart = _.cloneDeep(singleYBaseChart);
      initYAxis(chart);
      expect(chart).toHaveProperty('yAxisFormat');
    });

    it('sets the yAxisLabel', function () {
      const chart = _.cloneDeep(singleYBaseChart);
      initYAxis(chart);
      expect(chart).toHaveProperty('yAxisLabel', 'y1');
    });
  });

  describe('with multiple y aspects', function () {
    it('sets the yAxisFormatter the the field formats convert fn for the first y aspect', function () {
      const chart = _.cloneDeep(baseChart);
      initYAxis(chart);

      expect(chart).toHaveProperty('yAxisFormat');
      expect(chart.yAxisFormat).toBe(chart.aspects.y[0].format);
      expect(chart.yAxisFormat).not.toBe(chart.aspects.y[1].format);
    });

    it('does not set the yAxisLabel, it does not make sense to put multiple labels on the same axis', function () {
      const chart = _.cloneDeep(baseChart);
      initYAxis(chart);
      expect(chart).toHaveProperty('yAxisLabel', '');
    });
  });
});
