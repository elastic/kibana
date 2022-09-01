/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import type { Metric } from '../../../../common/types';
import { createSeries } from '../__mocks__';
import { convertToCounterRateFormulaColumn } from './counter_rate';
import { CommonColumnsConverterArgs, FormulaColumn } from './types';

describe('convertToCounterRateFormulaColumn', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();
  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.POSITIVE_RATE,
  };

  test.each<[string, CommonColumnsConverterArgs, Partial<FormulaColumn> | null]>([
    ['null if metric contains empty field param', { series, metrics: [metric], dataView }, null],
    [
      'formula column if metric contains field param',
      { series, metrics: [{ ...metric, field: dataView.fields[0].name }], dataView },
      {
        operationType: 'formula',
        params: { formula: 'pick_max(differences(max(bytes)), 0)' },
        meta: { metricId: 'some-id' },
      },
    ],
    [
      'differences formula with shift if metric contains unit',
      { series, metrics: [{ ...metric, field: dataView.fields[0].name, unit: '1h' }], dataView },
      {
        operationType: 'formula',
        params: {
          formula: 'pick_max(differences(max(bytes), shift=1h), 0)',
        },
        meta: { metricId: 'some-id' },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToCounterRateFormulaColumn(input)).toBeNull();
    } else {
      expect(convertToCounterRateFormulaColumn(input)).toEqual(expect.objectContaining(expected));
    }
  });
});
