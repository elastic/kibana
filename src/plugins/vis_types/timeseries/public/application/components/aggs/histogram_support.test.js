/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { Agg } from './agg';
import { FieldSelect } from './field_select';
import { FIELDS, METRIC, SERIES, PANEL } from '../../../test_utils';
import { setDataStart } from '../../../services';
import { dataPluginMock } from '../../../../../../data/public/mocks';

jest.mock('../query_bar_wrapper', () => ({
  QueryBarWrapper: jest.fn(() => null),
}));

const runTest = (aggType, name, test, additionalProps = {}) => {
  describe(aggType, () => {
    const metric = {
      ...METRIC,
      type: aggType,
      field: 'histogram_value',
      ...additionalProps,
    };
    const series = { ...SERIES, metrics: [metric] };
    const panel = PANEL;

    it(name, () => {
      const wrapper = mountWithIntl(
        <div>
          <Agg
            onAdd={jest.fn()}
            onModelChange={jest.fn()}
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
  beforeAll(() => setDataStart(dataPluginMock.createStartContract()));

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
    shouldHaveHistogramSupport('min');
    shouldHaveHistogramSupport('max');
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
    shouldNotHaveHistogramSupport('variance');
    shouldNotHaveHistogramSupport('sum_of_squares');
    shouldNotHaveHistogramSupport('std_deviation');
    shouldNotHaveHistogramSupport('positive_rate');
    shouldNotHaveHistogramSupport('top_hit');
  });
});
