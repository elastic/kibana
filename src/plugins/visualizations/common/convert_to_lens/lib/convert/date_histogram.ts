/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggParamsDateHistogram } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import { DataType, DateHistogramParams } from '../../types';
import { getFieldNameFromField } from '../utils';
import { DateHistogramColumn } from './types';

export const getLabel = (aggParams: AggParamsDateHistogram, fieldName: string) => {
  return aggParams && 'customLabel' in aggParams ? aggParams.customLabel ?? fieldName : fieldName;
};

export const convertToDateHistogramParams = (
  aggParams: AggParamsDateHistogram,
  dropEmptyRowsInDateHistogram: boolean
): DateHistogramParams => {
  return {
    interval: aggParams.interval ?? 'auto',
    dropPartials: aggParams.drop_partials,
    includeEmptyRows: !dropEmptyRowsInDateHistogram,
  };
};

export const convertToDateHistogramColumn = (
  aggId: string,
  aggParams: AggParamsDateHistogram,
  dataView: DataView,
  isSplit: boolean,
  dropEmptyRowsInDateHistogram: boolean
): DateHistogramColumn | null => {
  const dateFieldName = getFieldNameFromField(aggParams.field);

  if (!dateFieldName) {
    return null;
  }

  const dateField = dataView.getFieldByName(dateFieldName);
  if (!dateField) {
    return null;
  }

  const params = convertToDateHistogramParams(aggParams, dropEmptyRowsInDateHistogram);
  const label = getLabel(aggParams, dateFieldName);

  return {
    columnId: uuidv4(),
    label,
    operationType: 'date_histogram',
    dataType: dateField.type as DataType,
    isBucketed: true,
    isSplit,
    sourceField: dateField.name,
    params,
    timeShift: aggParams.timeShift,
    meta: { aggId },
  };
};
