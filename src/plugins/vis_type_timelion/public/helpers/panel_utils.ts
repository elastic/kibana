/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import type { Position } from '@elastic/charts';
import type { TimefilterContract } from 'src/plugins/data/public';
import type { IUiSettingsClient } from 'kibana/public';

import { calculateInterval } from '../../common/lib';
import { xaxisFormatterProvider } from './xaxis_formatter';
import { tickFormatters } from './tick_formatters';

import type { Series } from './timelion_request_handler';

export interface IAxis {
  delta?: number;
  max?: number;
  min?: number;
  mode: string;
  options?: {
    units: { prefix: string; suffix: string };
  };
  tickSize?: number;
  ticks: number;
  tickLength: number;
  timezone: string;
  tickDecimals?: number;
  tickFormatter: (val: number) => string;
  tickGenerator?(axis: IAxis): number[];
  units?: { type: string; prefix: string; suffix: string };
  domain?: {
    fit?: boolean;
    min?: number;
    max?: number;
  };
  position?: Position;
  axisLabel: string;
}

export const validateLegendPositionValue = (position: string) => /^(n|s)(e|w)$/s.test(position);

export const createTickFormat = (
  intervalValue: string,
  timefilter: TimefilterContract,
  uiSettings: IUiSettingsClient
) => {
  // Get the X-axis tick format
  const time = timefilter.getBounds();
  const interval = calculateInterval(
    (time.min && time.min.valueOf()) || 0,
    (time.max && time.max.valueOf()) || 0,
    uiSettings.get('timelion:target_buckets') || 200,
    intervalValue,
    uiSettings.get('timelion:min_interval') || '1ms'
  );
  const format = xaxisFormatterProvider(uiSettings)(interval);

  return (val: number) => moment(val).format(format);
};

/** While we support 2 versions of the timeline, we need this adapter. **/
const adaptYaxisParams = (yaxis: IAxis) => {
  const y = { ...yaxis };

  if (y.units) {
    const formatters = tickFormatters(y);
    y.tickFormatter = formatters[y.units.type as keyof typeof formatters];
  } else if (yaxis.tickDecimals) {
    y.tickFormatter = (val: number) => val.toFixed(yaxis.tickDecimals);
  }

  const max = yaxis.max ? yaxis.max : undefined;
  const min = yaxis.min ? yaxis.min : undefined;

  y.domain = {
    fit: min === undefined && max === undefined,
    max,
    min,
  };
  return y;
};

export const extractYAxis = (series: Series) => {
  let yaxis = (series._global?.yaxes ?? []).reduce(
    (acc: IAxis, item: IAxis) => ({
      ...acc,
      ...item,
    }),
    {}
  );

  if (yaxis) {
    yaxis = adaptYaxisParams(yaxis);
  }

  return yaxis;
};
