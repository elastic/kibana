/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CounterRateIndexPatternColumn, MaxIndexPatternColumn } from '@kbn/lens-common';
import { getLegendTruncateAfterLines, processMetricColumnsWithReferences } from './utils';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../columns/utils';

const createCounterRateColumn = (): CounterRateIndexPatternColumn => ({
  customLabel: false,
  filter: undefined,
  operationType: 'counter_rate',
  label: '',
  isBucketed: false,
  dataType: 'number',
  params: {},
  references: [],
});

const createMaxReferenceColumn = (): MaxIndexPatternColumn => ({
  operationType: 'max',
  sourceField: 'bytes',
  label: 'Max of bytes',
  customLabel: false,
  isBucketed: false,
  dataType: 'number',
  params: { emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE },
});

describe('utils', () => {
  describe('processMetricColumnsWithReferences', () => {
    it('returns visible metrics and references as separate arrays', () => {
      const mainMetric = createCounterRateColumn();
      const refMetric = createMaxReferenceColumn();

      const result = processMetricColumnsWithReferences(
        [[mainMetric, refMetric]],
        (index) => `metric_${index}`,
        (index) => `metric_ref_${index}`
      );

      expect(result.metricColumns).toEqual([{ column: mainMetric, id: 'metric_0' }]);
      expect(result.referencesColumns).toEqual([{ column: refMetric, id: 'metric_ref_0' }]);
      expect(mainMetric.references).toEqual(['metric_ref_0']);
    });

    it('keeps metrics and references in separate arrays (not interleaved)', () => {
      const counterRate0 = createCounterRateColumn();
      const counterRate1 = createCounterRateColumn();
      const maxRef0 = createMaxReferenceColumn();
      const maxRef1 = createMaxReferenceColumn();

      const { metricColumns, referencesColumns } = processMetricColumnsWithReferences(
        [
          [counterRate0, maxRef0],
          [counterRate1, maxRef1],
        ],
        (index) => `metric_${index}`,
        (index) => `metric_ref_${index}`
      );

      expect(metricColumns.map(({ id }) => id)).toEqual(['metric_0', 'metric_1']);
      expect(referencesColumns.map(({ id }) => id)).toEqual(['metric_ref_0', 'metric_ref_1']);
    });
  });

  describe('getLegendTruncateAfterLines', () => {
    it.each<
      [input: Parameters<typeof getLegendTruncateAfterLines>['0'], expected: number | undefined]
    >([
      [{}, undefined],
      // xy and heatmap
      [{ shouldTruncate: true }, 1],
      [{ shouldTruncate: true, maxLines: 1 }, 1],
      [{ shouldTruncate: true, maxLines: 0 }, undefined],
      [{ shouldTruncate: false, maxLines: 1 }, undefined],
      [{ shouldTruncate: false, maxLines: 0 }, undefined],
      [{ maxLines: 0 }, undefined],
      [{ maxLines: 1 }, undefined],
      // partition
      [{ truncateLegend: true }, 1],
      [{ truncateLegend: true, legendMaxLines: 1 }, 1],
      [{ truncateLegend: true, legendMaxLines: 0 }, undefined],
      [{ truncateLegend: false, legendMaxLines: 1 }, undefined],
      [{ legendMaxLines: 1 }, undefined],
      [{ truncateLegend: false, legendMaxLines: 0 }, undefined],
      [{ legendMaxLines: 0 }, undefined],
    ])('legend config of %j should return %s', (input, expected) => {
      expect(getLegendTruncateAfterLines(input)).toBe(expected);
    });
  });
});
