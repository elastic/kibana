/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { scaleLinear } from 'd3-scale';
import { DatatableRow } from 'src/plugins/expressions';
import { GaugeState } from '../../common/types/expression_functions';

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
      const biggerValue = Math.max(...numberValues);
      const nicelyRounded = scaleLinear().domain([minValue, biggerValue]).nice().ticks(4);
      if (nicelyRounded.length > 2) {
        const ticksDifference = Math.abs(nicelyRounded[0] - nicelyRounded[1]);
        return nicelyRounded[nicelyRounded.length - 1] + ticksDifference;
      }
      return minValue === biggerValue ? biggerValue + 1 : biggerValue;
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

export const getGoalValue = (row?: DatatableRow, state?: GaugeState) => {
  const currentValue = getValueFromAccessor('goalAccessor', row, state);
  if (currentValue != null) {
    return currentValue;
  }
  const minValue = getMinValue(row, state);
  const maxValue = getMaxValue(row, state);
  return Math.round((maxValue - minValue) * 0.75 + minValue);
};
