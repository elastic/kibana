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

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { FilterRatioAgg } from './filter_ratio';
import { FIELDS, METRIC, SERIES, PANEL } from '../../../test_utils';
import { EuiComboBox } from '@elastic/eui';

describe('TSVB Filter Ratio', () => {
  const setup = (metric) => {
    const series = { ...SERIES, metrics: [metric] };
    const panel = { ...PANEL, series };

    const wrapper = mountWithIntl(
      <div>
        <FilterRatioAgg
          onAdd={jest.fn()}
          onChange={jest.fn()}
          onDelete={jest.fn()}
          panel={panel}
          fields={FIELDS}
          model={metric}
          series={series}
          siblings={series.metrics}
          dragHandleProps={{}}
        />
      </div>
    );
    return wrapper;
  };

  describe('histogram support', () => {
    it('should only display histogram compattible aggs', () => {
      const metric = {
        ...METRIC,
        metric_agg: 'avg',
        field: 'histogram_value',
      };
      const wrapper = setup(metric);
      expect(wrapper.find(EuiComboBox).at(1).props().options).toMatchInlineSnapshot(`
        Array [
          Object {
            "label": "Average",
            "value": "avg",
          },
          Object {
            "label": "Count",
            "value": "count",
          },
          Object {
            "label": "Sum",
            "value": "sum",
          },
          Object {
            "label": "Value Count",
            "value": "value_count",
          },
        ]
      `);
    });
    const shouldNotHaveHistogramField = (agg) => {
      it(`should not have histogram fields for ${agg}`, () => {
        const metric = {
          ...METRIC,
          metric_agg: agg,
          field: '',
        };
        const wrapper = setup(metric);
        expect(wrapper.find(EuiComboBox).at(2).props().options).toMatchInlineSnapshot(`
          Array [
            Object {
              "label": "number",
              "options": Array [
                Object {
                  "label": "system.cpu.user.pct",
                  "value": "system.cpu.user.pct",
                },
              ],
            },
          ]
        `);
      });
    };
    shouldNotHaveHistogramField('max');
    shouldNotHaveHistogramField('min');
    shouldNotHaveHistogramField('positive_rate');

    it(`should not have histogram fields for cardinality`, () => {
      const metric = {
        ...METRIC,
        metric_agg: 'cardinality',
        field: '',
      };
      const wrapper = setup(metric);
      expect(wrapper.find(EuiComboBox).at(2).props().options).toMatchInlineSnapshot(`
        Array [
          Object {
            "label": "date",
            "options": Array [
              Object {
                "label": "@timestamp",
                "value": "@timestamp",
              },
            ],
          },
          Object {
            "label": "number",
            "options": Array [
              Object {
                "label": "system.cpu.user.pct",
                "value": "system.cpu.user.pct",
              },
            ],
          },
        ]
      `);
    });
  });
});
