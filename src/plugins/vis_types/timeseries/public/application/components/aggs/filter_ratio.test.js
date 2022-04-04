/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { FilterRatioAgg } from './filter_ratio';
import { FIELDS, METRIC, SERIES, PANEL } from '../../../test_utils';
import { EuiComboBox } from '@elastic/eui';
import { dataPluginMock } from '../../../../../../data/public/mocks';
import { setDataStart } from '../../../services';

jest.mock('../query_bar_wrapper', () => ({
  QueryBarWrapper: jest.fn(() => null),
}));

describe('TSVB Filter Ratio', () => {
  beforeAll(() => setDataStart(dataPluginMock.createStartContract()));

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
      expect(
        wrapper
          .find(EuiComboBox)
          .at(1)
          .props()
          .options.map(({ value }) => value)
      ).toEqual(['avg', 'count', 'max', 'min', 'sum', 'value_count']);
    });
    const shouldNotHaveHistogramField = (agg) => {
      it(`should not have histogram fields for ${agg}`, () => {
        const metric = {
          ...METRIC,
          metric_agg: agg,
          field: '',
        };
        const wrapper = setup(metric);
        expect(wrapper.find(EuiComboBox).at(2).props().options).toEqual([
          {
            label: 'number',
            options: [
              {
                disabled: false,
                label: 'system.cpu.user.pct',
                value: 'system.cpu.user.pct',
              },
            ],
          },
        ]);
      });
    };
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
                "disabled": false,
                "label": "@timestamp",
                "value": "@timestamp",
              },
            ],
          },
          Object {
            "label": "number",
            "options": Array [
              Object {
                "disabled": false,
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
