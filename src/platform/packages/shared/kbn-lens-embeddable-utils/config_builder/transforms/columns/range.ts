/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RangeIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiRangeOperation, LensApiHistogramOperation } from '../../schema/bucket_ops';
import {
  LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
  LENS_HISTOGRAM_GRANULARITY_MAX,
  LENS_RANGE_DEFAULT_INTERVAL,
} from '../../schema/constants';
import { getLensAPIBucketSharedProps, getLensStateBucketSharedProps } from './utils';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';

export function fromRangeOrHistogramLensApiToLensState(
  options: LensApiRangeOperation | LensApiHistogramOperation
): RangeIndexPatternColumn {
  const { operation } = options;
  if (operation === 'range') {
    return {
      operationType: 'range',
      dataType: 'string',
      ...getLensStateBucketSharedProps(options),
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
    ...getLensStateBucketSharedProps(options),
    params: {
      type: 'histogram',
      maxBars: options.granularity,
      ranges: [],
      format: fromFormatAPIToLensState(options.format),
      includeEmptyRows: options.include_empty_rows,
    },
  };
}

export function fromRangeOrHistogramLensStateToAPI(
  column: RangeIndexPatternColumn
): LensApiRangeOperation | LensApiHistogramOperation {
  if (column.params.type === 'range') {
    return {
      operation: 'range',
      ...getLensAPIBucketSharedProps(column),
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
    include_empty_rows: Boolean(column.params.includeEmptyRows),
    granularity:
      column.params?.maxBars !== LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE &&
      column.params?.maxBars > LENS_HISTOGRAM_GRANULARITY_MAX
        ? 'auto'
        : column.params?.maxBars,
    ...getLensAPIBucketSharedProps(column),
    ...(column.params?.format ? { format: fromFormatLensStateToAPI(column.params.format) } : {}),
  };
}
