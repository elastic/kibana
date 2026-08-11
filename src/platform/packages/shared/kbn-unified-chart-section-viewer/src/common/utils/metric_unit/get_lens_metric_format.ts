/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils';
import type { MetricUnit } from '../../../types';

const formatTypeByUnit = {
  percent: 'percent',
  bytes: 'bytes',
  ns: 'duration',
  us: 'duration',
  ms: 'duration',
  s: 'duration',
  m: 'duration',
  h: 'duration',
  d: 'duration',
} satisfies Record<Exclude<MetricUnit, 'count'>, NonNullable<LensBaseLayer['format']> | undefined>;

export const durationUnitNames = {
  ns: 'nanoseconds',
  us: 'microseconds',
  ms: 'milliseconds',
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

export function getLensMetricFormat(
  unit: MetricUnit
): Pick<LensBaseLayer, 'format' | 'decimals' | 'fromUnit' | 'toUnit'> | undefined {
  if (!unit || unit === 'count' || isSpecialUnitOfCount(unit)) {
    return;
  }

  const format = formatTypeByUnit[unit];
  if (!format) {
    return;
  }

  if (isDurationUnit(unit)) {
    return {
      format,
      fromUnit: durationUnitNames[unit],
      toUnit: 'humanizePrecise',
      decimals: 0,
    };
  }

  return {
    format,
    decimals: 1,
  };
}

const isDurationUnit = (unit: string): unit is keyof typeof durationUnitNames => {
  return unit in durationUnitNames;
};

const isSpecialUnitOfCount = (unit: string): unit is `{${string}}` => {
  return unit.match(/^\{.*\}$/) !== null;
};
