/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import type { Metric } from '../../../../common/types';
import { createSeries } from '../__mocks__';
import { convertToCounterRateColumn } from './counter_rate';
import { CommonColumnsConverterArgs, CounterRateColumn, MaxColumn } from './types';

describe('convertToCounterRateFormulaColumn', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();
  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.POSITIVE_RATE,
  };

  test.each<
    [string, CommonColumnsConverterArgs, [Partial<MaxColumn>, Partial<CounterRateColumn>] | null]
  >([
    ['null if metric contains empty field param', { series, metrics: [metric], dataView }, null],
    [
      'max and cpunter rate columns if metric contains field param',
      { series, metrics: [{ ...metric, field: dataView.fields[0].name }], dataView },
      [
        {
          operationType: 'max',
          sourceField: dataView.fields[0].name,
        },
        {
          operationType: 'counter_rate',
        },
      ],
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToCounterRateColumn(input)).toBeNull();
    } else if (Array.isArray(expected)) {
      const results = convertToCounterRateColumn(input);
      expect(results).toEqual(expected.map(expect.objectContaining));
      expect(results?.[1].references[0]).toEqual(results?.[0].columnId);
    } else {
      expect(convertToCounterRateColumn(input)).toEqual(expect.objectContaining(expected));
    }
  });
});
