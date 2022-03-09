/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DatatableColumn, DatatableRow } from 'src/plugins/expressions';
import { getAccessorByDimension } from '../../../../../visualizations/common/utils';
import { Accessors, GaugeArguments } from '../../../common';

export const getValueFromAccessor = (
  accessor: string,
  row?: DatatableRow
): DatatableRow[string] | number | undefined => {
  if (!row || !accessor) return;

  const value = accessor && row[accessor];
  if (value === null || (Array.isArray(value) && !value.length)) {
    return;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value) && typeof value[value.length - 1] === 'number') {
    return value[value.length - 1];
  }
};

// returns nice rounded numbers similar to d3 nice() function
function getNiceRange(min: number, max: number) {
  const maxTicks = 5;
  const offsetMax = max + 0.0000001; // added to avoid max value equal to metric value
  const range = getNiceNumber(offsetMax - min);
  const tickSpacing = getNiceNumber(range / (maxTicks - 1));
  return {
    min: Math.floor(min / tickSpacing) * tickSpacing,
    max: Math.ceil(Math.ceil(offsetMax / tickSpacing) * tickSpacing),
  };
}

function getNiceNumber(localRange: number) {
  const exponent = Math.floor(Math.log10(localRange));
  const fraction = localRange / Math.pow(10, exponent);
  let niceFraction = 10;

  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;

  return niceFraction * Math.pow(10, exponent);
}

export const getMaxValue = (row?: DatatableRow, accessors?: Accessors): number => {
  const FALLBACK_VALUE = 100;
  const currentValue = accessors?.max ? getValueFromAccessor(accessors.max, row) : undefined;
  if (currentValue !== undefined && currentValue !== null) {
    return currentValue;
  }
  if (row && accessors) {
    const { metric, goal } = accessors;
    const metricValue = metric && row[metric];
    const goalValue = goal && row[goal];
    const minValue = getMinValue(row, accessors);
    if (metricValue != null) {
      const numberValues = [minValue, goalValue, metricValue].filter((v) => typeof v === 'number');
      const maxValue = Math.max(...numberValues);
      return getNiceRange(minValue, maxValue).max;
    }
  }
  return FALLBACK_VALUE;
};

export const getMinValue = (row?: DatatableRow, accessors?: Accessors) => {
  const currentValue = accessors?.min ? getValueFromAccessor(accessors.min, row) : undefined;
  if (currentValue !== undefined && currentValue !== null) {
    return currentValue;
  }
  const FALLBACK_VALUE = 0;
  if (row && accessors) {
    const { metric, max } = accessors;
    const metricValue = metric && row[metric];
    const maxValue = max && row[max];
    const numberValues = [metricValue, maxValue].filter((v) => typeof v === 'number');
    if (Math.min(...numberValues) <= 0) {
      return Math.min(...numberValues) - 10; // TODO: TO THINK THROUGH
    }
  }
  return FALLBACK_VALUE;
};

export const getGoalValue = (row?: DatatableRow, accessors?: Accessors) => {
  const currentValue = accessors?.goal ? getValueFromAccessor(accessors.goal, row) : undefined;
  if (currentValue !== undefined && currentValue !== null) {
    return currentValue;
  }

  const minValue = getMinValue(row, accessors);
  const maxValue = getMaxValue(row, accessors);
  return Math.round((maxValue - minValue) * 0.75 + minValue);
};

export const getAccessorsFromArgs = (
  args: GaugeArguments,
  columns: DatatableColumn[]
): Accessors | undefined => {
  const { metric, min, max, goal } = args;
  if (!metric && !min && !max && !goal) {
    return;
  }

  return {
    min: min ? getAccessorByDimension(min, columns) : undefined,
    max: max ? getAccessorByDimension(max, columns) : undefined,
    goal: goal ? getAccessorByDimension(goal, columns) : undefined,
    metric: metric ? getAccessorByDimension(metric, columns) : undefined,
  };
};
