/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { createSeries } from '../__mocks__';
import { Metric } from '../../../../common/types';
import {
  AvgColumn,
  CardinalityColumn,
  CountColumn,
  CounterRateColumn,
  FormulaColumn,
  MaxColumn,
  MinColumn,
  StandardDeviationColumn,
  SumColumn,
} from './types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { convertToStandartDeviationColumn } from './std_deviation';

describe('convertToStandartDeviationColumn', () => {
  const series = createSeries();
  const dataView = stubLogstashDataView;
  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.STD_DEVIATION,
  };
  const field = dataView.fields[0].name;

  test.each<
    [
      string,
      Parameters<typeof convertToStandartDeviationColumn>,
      Array<Partial<
        | FormulaColumn
        | AvgColumn
        | CountColumn
        | CardinalityColumn
        | CounterRateColumn
        | MaxColumn
        | MinColumn
        | SumColumn
        | StandardDeviationColumn
      > | null> | null
    ]
  >([
    ['null if field is not provided', [{ series, metrics: [metric], dataView }], null],
    [
      'std deviation columns if mode = upper',
      [{ series, metrics: [{ ...metric, mode: 'upper', field }], dataView }],
      [
        {
          meta: { metricId: 'some-id' },
          operationType: 'formula',
          params: {
            formula: 'average(bytes) + 1.5 * standard_deviation(bytes)',
          },
        },
      ],
    ],
    [
      'std deviation columns if mode = lower',
      [{ series, metrics: [{ ...metric, mode: 'lower', field }], dataView }],
      [
        {
          meta: { metricId: 'some-id' },
          operationType: 'formula',
          params: {
            formula: 'average(bytes) - 1.5 * standard_deviation(bytes)',
          },
        },
      ],
    ],
    [
      'std deviation columns if mode = band',
      [{ series, metrics: [{ ...metric, mode: 'band', field }], dataView }],
      [
        {
          meta: { metricId: 'some-id' },
          operationType: 'formula',
          params: {
            formula: 'average(bytes) + 1.5 * standard_deviation(bytes)',
          },
        },
        {
          meta: { metricId: 'some-id' },
          operationType: 'formula',
          params: {
            formula: 'average(bytes) - 1.5 * standard_deviation(bytes)',
          },
        },
      ],
    ],
    [
      'std deviation columns',
      [
        {
          series,
          metrics: [{ ...metric, mode: undefined, field }],
          dataView,
        },
      ],
      [
        {
          meta: { metricId: 'some-id' },
          operationType: 'standard_deviation',
          params: {},
        },
      ],
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToStandartDeviationColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToStandartDeviationColumn(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertToStandartDeviationColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
