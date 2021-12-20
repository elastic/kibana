/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DatatableRow } from 'src/plugins/expressions';
import type { GaugeState } from '../../common/types/expression_functions';

type GaugeAccessors = 'maxAccessor' | 'minAccessor' | 'goalAccessor' | 'metricAccessor';

type GaugeAccessorsType = Pick<GaugeState, GaugeAccessors>;

export const getValueFromAccessor = (
  accessorName: GaugeAccessors,
  row?: DatatableRow,
  state?: GaugeAccessorsType
) => {
  if (row && state) {
    const accessor = state[accessorName];
    const value = accessor && row[accessor];
    if (typeof value === 'number') {
      return value;
    }
    if (value?.length) {
      if (typeof value[value.length - 1] === 'number') {
        return value[value.length - 1];
      }
    }
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

export const getMaxValue = (row?: DatatableRow, state?: GaugeAccessorsType): number => {
  const FALLBACK_VALUE = 100;
  const currentValue = getValueFromAccessor('maxAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  if (row && state) {
    const { metricAccessor, goalAccessor } = state;
    const metricValue = metricAccessor && row[metricAccessor];
    const goalValue = goalAccessor && row[goalAccessor];
    const minValue = getMinValue(row, state);
    if (metricValue != null) {
      const numberValues = [minValue, goalValue, metricValue].filter((v) => typeof v === 'number');
      const maxValue = Math.max(...numberValues);
      return getNiceRange(minValue, maxValue).max;
    }
  }
  return FALLBACK_VALUE;
};

export const getMinValue = (row?: DatatableRow, state?: GaugeAccessorsType) => {
  const currentValue = getValueFromAccessor('minAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  const FALLBACK_VALUE = 0;
  if (row && state) {
    const { metricAccessor, maxAccessor } = state;
    const metricValue = metricAccessor && row[metricAccessor];
    const maxValue = maxAccessor && row[maxAccessor];
    const numberValues = [metricValue, maxValue].filter((v) => typeof v === 'number');
    if (Math.min(...numberValues) <= 0) {
      return Math.min(...numberValues) - 10; // TODO: TO THINK THROUGH
    }
  }
  return FALLBACK_VALUE;
};

export const getGoalValue = (row?: DatatableRow, state?: GaugeAccessorsType) => {
  const currentValue = getValueFromAccessor('goalAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  const minValue = getMinValue(row, state);
  const maxValue = getMaxValue(row, state);
  return Math.round((maxValue - minValue) * 0.75 + minValue);
};
