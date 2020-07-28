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
import { AggSelect } from './agg_select';
import { METRIC, SERIES } from '../../../test_utils';
import { EuiComboBox } from '@elastic/eui';

describe('TSVB AggSelect', () => {
  const setup = (panelType: string, value: string) => {
    const metric = {
      ...METRIC,
      type: 'filter_ratio',
      field: 'histogram_value',
    };
    const series = { ...SERIES, metrics: [metric] };

    const wrapper = mountWithIntl(
      <div>
        <AggSelect
          id="test"
          onChange={jest.fn()}
          panelType={panelType}
          value={value}
          siblings={series.metrics}
        />
      </div>
    );
    return wrapper;
  };

  it('should only display filter ratio compattible aggs', () => {
    const wrapper = setup('filter_ratio', 'avg');
    expect(wrapper.find(EuiComboBox).props().options).toMatchInlineSnapshot(`
      Array [
        Object {
          "label": "Average",
          "value": "avg",
        },
        Object {
          "label": "Cardinality",
          "value": "cardinality",
        },
        Object {
          "label": "Count",
          "value": "count",
        },
        Object {
          "label": "Positive Rate",
          "value": "positive_rate",
        },
        Object {
          "label": "Max",
          "value": "max",
        },
        Object {
          "label": "Min",
          "value": "min",
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

  it('should only display histogram compattible aggs', () => {
    const wrapper = setup('histogram', 'avg');
    expect(wrapper.find(EuiComboBox).props().options).toMatchInlineSnapshot(`
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

  it('should only display metrics compattible aggs', () => {
    const wrapper = setup('metrics', 'avg');
    expect(wrapper.find(EuiComboBox).props().options).toMatchInlineSnapshot(`
      Array [
        Object {
          "label": "Average",
          "value": "avg",
        },
        Object {
          "label": "Cardinality",
          "value": "cardinality",
        },
        Object {
          "label": "Count",
          "value": "count",
        },
        Object {
          "label": "Filter Ratio",
          "value": "filter_ratio",
        },
        Object {
          "label": "Positive Rate",
          "value": "positive_rate",
        },
        Object {
          "label": "Max",
          "value": "max",
        },
        Object {
          "label": "Min",
          "value": "min",
        },
        Object {
          "label": "Percentile",
          "value": "percentile",
        },
        Object {
          "label": "Percentile Rank",
          "value": "percentile_rank",
        },
        Object {
          "label": "Static Value",
          "value": "static",
        },
        Object {
          "label": "Std. Deviation",
          "value": "std_deviation",
        },
        Object {
          "label": "Sum",
          "value": "sum",
        },
        Object {
          "label": "Sum of Squares",
          "value": "sum_of_squares",
        },
        Object {
          "label": "Top Hit",
          "value": "top_hit",
        },
        Object {
          "label": "Value Count",
          "value": "value_count",
        },
        Object {
          "label": "Variance",
          "value": "variance",
        },
      ]
    `);
  });
});
