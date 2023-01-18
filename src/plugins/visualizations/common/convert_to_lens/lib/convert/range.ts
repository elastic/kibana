/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggParamsRange, AggParamsHistogram } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { v4 as uuid } from 'uuid';
import { RANGE_MODES } from '../../constants';
import { DataType, RangeParams } from '../../types';
import { getFieldNameFromField } from '../utils';
import { RangeColumn } from './types';

const isHistogramAggParams = (
  aggParams: AggParamsRange | AggParamsHistogram
): aggParams is AggParamsHistogram => {
  return aggParams && 'interval' in aggParams;
};

export const convertToRangeParams = (
  aggParams: AggParamsRange | AggParamsHistogram
): RangeParams => {
  if (isHistogramAggParams(aggParams)) {
    return {
      type: RANGE_MODES.Histogram,
      maxBars: aggParams.maxBars ?? 'auto',
      includeEmptyRows: aggParams.min_doc_count,
    };
  } else {
    return {
      type: RANGE_MODES.Range,
      maxBars: 'auto',
      ranges: aggParams.ranges?.map((range) => ({
        label: range.label,
        from: range.from ?? null,
        to: range.to ?? null,
      })),
    };
  }
};

export const convertToRangeColumn = (
  aggId: string,
  aggParams: AggParamsRange | AggParamsHistogram,
  label: string,
  dataView: DataView,
  isSplit: boolean = false
): RangeColumn | null => {
  const fieldName = getFieldNameFromField(aggParams.field);

  if (!fieldName) {
    return null;
  }

  const field = dataView.getFieldByName(fieldName);
  if (!field) {
    return null;
  }

  const params = convertToRangeParams(aggParams);

  return {
    columnId: uuid(),
    label,
    operationType: 'range',
    dataType: field.type as DataType,
    isBucketed: true,
    isSplit,
    sourceField: field.name,
    params,
    timeShift: aggParams.timeShift,
    meta: { aggId },
  };
};
