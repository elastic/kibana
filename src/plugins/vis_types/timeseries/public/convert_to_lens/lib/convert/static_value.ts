/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import {
  StaticValueParams,
  StaticValueColumn as BaseStaticValueColumn,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import { CommonColumnsConverterArgs, FormulaColumn, StaticValueColumn } from './types';
import type { Metric } from '../../../../common/types';
import { createColumn, getFormat } from './column';
import { createFormulaColumn } from './formula';

export const convertToStaticValueParams = ({ value }: Metric): StaticValueParams => ({
  value,
});

export const convertToStaticValueColumn = (
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  {
    visibleSeriesCount = 0,
    reducedTimeRange,
  }: { visibleSeriesCount?: number; reducedTimeRange?: string } = {}
): StaticValueColumn | null => {
  // Lens support reference lines only when at least one layer data exists
  if (visibleSeriesCount === 1) {
    return null;
  }
  const currentMetric = metrics[metrics.length - 1];
  if (!currentMetric.value) {
    return null;
  }
  return {
    operationType: 'static_value',
    references: [],
    ...createColumn(series, currentMetric, undefined, { reducedTimeRange }),
    params: {
      ...convertToStaticValueParams(currentMetric),
      ...getFormat(series),
    },
  };
};

export const createStaticValueColumn = (staticValue: number): BaseStaticValueColumn => ({
  columnId: uuidv4(),
  operationType: 'static_value',
  references: [],
  dataType: 'number',
  isStaticValue: true,
  isBucketed: false,
  isSplit: false,
  params: {
    value: staticValue.toString(),
  },
});

export const convertStaticValueToFormulaColumn = (
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  {
    visibleSeriesCount = 0,
    reducedTimeRange,
  }: { visibleSeriesCount?: number; reducedTimeRange?: string } = {}
): FormulaColumn | null => {
  // Lens support reference lines only when at least one layer data exists
  if (visibleSeriesCount === 1) {
    return null;
  }
  const currentMetric = metrics[metrics.length - 1];
  if (!currentMetric.value) {
    return null;
  }
  return createFormulaColumn(currentMetric.value, {
    series,
    metric: currentMetric,
    dataView,
  });
};
