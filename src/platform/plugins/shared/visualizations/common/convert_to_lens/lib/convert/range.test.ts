/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { AggParamsRange, AggParamsHistogram } from '@kbn/data-plugin/common';
import { convertToRangeColumn } from './range';
import { RangeColumn } from './types';
import { DataType } from '../../types';
import { RANGE_MODES } from '../../constants';

describe('convertToRangeColumn', () => {
  const aggId = `some-id`;
  const ranges = [
    {
      from: 1,
      to: 1000,
      label: '1',
    },
  ];
  const aggParamsRange: AggParamsRange = {
    field: stubLogstashDataView.fields[0].name,
    ranges,
  };
  const aggParamsHistogram: AggParamsHistogram = {
    interval: '1d',
    field: stubLogstashDataView.fields[0].name,
  };

  test.each<[string, Parameters<typeof convertToRangeColumn>, Partial<RangeColumn> | null]>([
    [
      'range column if provide valid range agg',
      [aggId, aggParamsRange, '', stubLogstashDataView],
      {
        dataType: stubLogstashDataView.fields[0].type as DataType,
        isBucketed: true,
        isSplit: false,
        sourceField: stubLogstashDataView.fields[0].name,
        meta: { aggId },
        params: {
          type: RANGE_MODES.Range,
          maxBars: 'auto',
          ranges,
        },
      },
    ],
    [
      'range column if provide valid histogram agg',
      [aggId, aggParamsHistogram, '', stubLogstashDataView, true],
      {
        dataType: stubLogstashDataView.fields[0].type as DataType,
        isBucketed: true,
        isSplit: true,
        sourceField: stubLogstashDataView.fields[0].name,
        meta: { aggId },
        params: {
          type: RANGE_MODES.Histogram,
          maxBars: 'auto',
        },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToRangeColumn(...input)).toBeNull();
    } else {
      expect(convertToRangeColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
