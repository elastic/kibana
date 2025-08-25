/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RangeIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiRangeOperation, LensApiHistogramOperation } from '../../schema/bucket_ops';
import {
  LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
  LENS_RANGE_DEFAULT_INTERVAL,
} from '../../schema/constants';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';

export function fromRangeOrHistogramLensApiToLensState(
  options: LensApiRangeOperation | LensApiHistogramOperation
): RangeIndexPatternColumn {
  const { operation, label, field } = options;
  if (operation === 'range') {
    return {
      operationType: 'range',
      dataType: 'string',
      sourceField: options.field,
      customLabel: label != null,
      label: label ?? field,
      isBucketed: true,
      params: {
        type: 'range',
        maxBars: 'auto',
        ranges: options.ranges.map(({ gt, lte, label: rangeLabel }) => ({
          from: gt ?? null,
          to: lte ?? null,
          label: rangeLabel ?? '',
        })) ?? [{ from: 0, to: LENS_RANGE_DEFAULT_INTERVAL, label: '' }],
        format: fromFormatAPIToLensState(options.format),
        parentFormat: { id: 'range', params: { template: 'arrow_right', replaceInfinity: true } },
      },
    };
  }

  return {
    operationType: 'range',
    dataType: 'number',
    sourceField: options.field,
    customLabel: label != null,
    label: label ?? field,
    isBucketed: true,
    params: {
      type: 'histogram',
      maxBars: options.granularity ?? LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
      ranges: [],
      format: fromFormatAPIToLensState(options.format),
      includeEmptyRows: options.include_empty_rows ?? LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
    },
  };
}

export function fromRangeOrHistogramLensStateToAPI(
  column: RangeIndexPatternColumn
): LensApiRangeOperation | LensApiHistogramOperation {
  if (column.params.type === 'range') {
    return {
      operation: 'range',
      field: column.sourceField,
      ...(column.label !== column.sourceField ? { label: column.label } : {}),
      ranges: column.params.ranges
        .filter(({ from, to }) => from != null || to != null)
        .map(({ from, to, label }) => ({
          ...(from != null ? { gt: from } : {}),
          ...(to != null ? { lte: to } : {}),
          ...(label != null ? { label } : {}),
        })),
      ...(column.params?.format ? { format: fromFormatLensStateToAPI(column.params.format) } : {}),
    };
  }
  return {
    operation: 'histogram',
    field: column.sourceField,
    ...(column.label !== column.sourceField ? { label: column.label } : {}),
    ...(column.params?.maxBars != null &&
    column.params.maxBars !== LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE
      ? { granularity: column.params.maxBars }
      : {}),
    ...(column.params.includeEmptyRows !== LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT
      ? { include_empty_rows: column.params.includeEmptyRows }
      : {}),
    ...(column.params?.format ? { format: fromFormatLensStateToAPI(column.params.format) } : {}),
  };
}
