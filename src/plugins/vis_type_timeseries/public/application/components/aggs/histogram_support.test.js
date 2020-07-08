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
import { Agg } from './agg';
import { FieldSelect } from './field_select';
import { FIELDS, METRIC, SERIES, PANEL } from '../../../test_utils';
const runTest = (aggType, name, test, additionalProps = {}) => {
  describe(aggType, () => {
    const metric = {
      ...METRIC,
      type: aggType,
      field: 'histogram_value',
      ...additionalProps,
    };
    const series = { ...SERIES, metrics: [metric] };
    const panel = { ...PANEL, series };

    it(name, () => {
      const wrapper = mountWithIntl(
        <div>
          <Agg
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
      test(wrapper);
    });
  });
};

describe('Histogram Types', () => {
  describe('supported', () => {
    const shouldHaveHistogramSupport = (aggType, additionalProps = {}) => {
      runTest(
        aggType,
        'supports',
        (wrapper) =>
          expect(wrapper.find(FieldSelect).at(0).props().restrict).toContain('histogram'),
        additionalProps
      );
    };
    shouldHaveHistogramSupport('avg');
    shouldHaveHistogramSupport('sum');
    shouldHaveHistogramSupport('value_count');
    shouldHaveHistogramSupport('percentile');
    shouldHaveHistogramSupport('percentile_rank');
    shouldHaveHistogramSupport('filter_ratio', { metric_agg: 'avg' });
  });
  describe('not supported', () => {
    const shouldNotHaveHistogramSupport = (aggType, additionalProps = {}) => {
      runTest(
        aggType,
        'does not support',
        (wrapper) =>
          expect(wrapper.find(FieldSelect).at(0).props().restrict).not.toContain('histogram'),
        additionalProps
      );
    };
    shouldNotHaveHistogramSupport('cardinality');
    shouldNotHaveHistogramSupport('max');
    shouldNotHaveHistogramSupport('min');
    shouldNotHaveHistogramSupport('variance');
    shouldNotHaveHistogramSupport('sum_of_squares');
    shouldNotHaveHistogramSupport('std_deviation');
    shouldNotHaveHistogramSupport('positive_rate');
    shouldNotHaveHistogramSupport('top_hit');
  });
});
