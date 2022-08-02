/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import { unitOfTime } from 'moment';

import { DomainRange } from '@elastic/charts';

import { getAdjustedInterval } from '@kbn/charts-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/public';
import { DateHistogramParams, HistogramParams } from '@kbn/visualizations-plugin/public';

import { Aspect } from '../types';

export const getXDomain = (params: Aspect['params']): DomainRange => {
  const minInterval = (params as DateHistogramParams | HistogramParams)?.interval ?? undefined;
  const bounds = (params as DateHistogramParams).date
    ? (params as DateHistogramParams).bounds
    : null;

  if (bounds) {
    return {
      min: bounds.min as number,
      max: bounds.max as number,
      minInterval,
    };
  }

  return {
    minInterval,
    min: NaN,
    max: NaN,
  };
};

export const getAdjustedDomain = (
  data: Datatable['rows'],
  { accessor, params }: Aspect,
  timeZone: string,
  domain: DomainRange | undefined,
  hasBars?: boolean
): DomainRange => {
  if (
    accessor &&
    domain &&
    'min' in domain &&
    'max' in domain &&
    'intervalESValue' in params &&
    'intervalESUnit' in params
  ) {
    const { interval, intervalESValue, intervalESUnit } = params;
    const xValues = uniq(data.map((d) => d[accessor]).sort());

    const [firstXValue] = xValues;
    const lastXValue = xValues[xValues.length - 1];

    const domainMin = Math.min(firstXValue, domain.min);
    const domainMaxValue = Math.max(domain.max - interval, lastXValue);
    const domainMax = hasBars ? domainMaxValue : domainMaxValue + interval;
    const minInterval = getAdjustedInterval(
      xValues,
      intervalESValue,
      intervalESUnit as unitOfTime.Base,
      timeZone
    );

    return {
      min: domainMin,
      max: domainMax,
      minInterval,
    };
  }

  return {
    minInterval: 'interval' in params ? params.interval : undefined,
    min: NaN,
    max: NaN,
  };
};
