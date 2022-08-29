/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Operations, PercentileRanksParams } from '@kbn/visualizations-plugin/common';
import { convertToPercentileRankParams, isPercentileRanksColumnWithMeta } from './percentile_rank';
import { PercentileRanksColumn, PercentileRanksColumnWithExtendedMeta } from './types';

describe('isPercentileRanksColumnWithMeta', () => {
  const percentileRankColumnWithoutMeta = {
    columnId: 'col',
    sourceField: 'some-field',
    operationType: Operations.PERCENTILE_RANK,
    isBucketed: false,
    isSplit: false,
    dataType: 'number',
    params: {
      value: 50,
    },
    meta: { metricId: 'someId' },
  } as PercentileRanksColumn;

  const percentileRankColumn: PercentileRanksColumnWithExtendedMeta = {
    ...percentileRankColumnWithoutMeta,
    meta: { ...percentileRankColumnWithoutMeta.meta, reference: 'some-ref.0' },
  };

  test.each<[string, Parameters<typeof isPercentileRanksColumnWithMeta>, boolean]>([
    ["false if meta doesn't contain reference", [percentileRankColumnWithoutMeta], false],
    ['true if meta contains reference', [percentileRankColumn], true],
  ])('should return %s', (_, input, expected) => {
    expect(isPercentileRanksColumnWithMeta(...input)).toBe(expected);
  });
});

describe('convertToPercentileRankParams', () => {
  test.each<
    [string, Parameters<typeof convertToPercentileRankParams>, PercentileRanksParams | null]
  >([
    ['null if value is undefined', [undefined], null],
    ['null if value is NaN', ['some-nan-value'], null],
    ['percentile ranks params if value is present and valid', ['100'], { value: 100 }],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToPercentileRankParams(...input)).toBeNull();
    }
    if (Array.isArray(expected)) {
      expect(convertToPercentileRankParams(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertToPercentileRankParams(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
