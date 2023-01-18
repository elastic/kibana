/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { v4 as uuid } from 'uuid';
import { DateHistogramParams, DataType } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { DateHistogramColumn, DateHistogramSeries } from './types';
import type { Panel } from '../../../../common/types';

const getInterval = (interval?: string) => {
  return interval && !interval?.includes('=') ? interval : 'auto';
};

export const convertToDateHistogramParams = (
  model: Panel | undefined,
  series: DateHistogramSeries,
  includeEmptyRows: boolean = true
): DateHistogramParams => {
  return {
    interval: getInterval(series.override_index_pattern ? series.series_interval : model?.interval),
    dropPartials: series.override_index_pattern
      ? series.series_drop_last_bucket > 0
      : (model?.drop_last_bucket ?? 0) > 0,
    includeEmptyRows,
  };
};

export const convertToDateHistogramColumn = (
  model: Panel | undefined,
  series: DateHistogramSeries,
  dataView: DataView,
  {
    fieldName,
    isSplit,
    includeEmptyRows = true,
  }: { fieldName: string; isSplit: boolean; includeEmptyRows?: boolean }
): DateHistogramColumn | null => {
  const dateField = dataView.getFieldByName(fieldName);

  if (!dateField) {
    return null;
  }

  const params = convertToDateHistogramParams(model, series, includeEmptyRows);

  return {
    columnId: uuid(),
    operationType: 'date_histogram',
    dataType: dateField.type as DataType,
    isBucketed: true,
    isSplit,
    sourceField: dateField.name,
    params,
  };
};
