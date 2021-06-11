/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import moment, { Moment } from 'moment-timezone';
import { Position, PointerEvent } from '@elastic/charts';

import { TimefilterContract } from 'src/plugins/data/public';
import { IUiSettingsClient } from 'kibana/public';

import { calculateInterval } from '../../common/lib';
import { xaxisFormatterProvider } from './xaxis_formatter';

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

interface TimeRangeBounds {
  min: Moment | undefined;
  max: Moment | undefined;
}

const activeCursor$ = new Subject<PointerEvent>();

const colors = [
  '#01A4A4',
  '#C66',
  '#D0D102',
  '#616161',
  '#00A1CB',
  '#32742C',
  '#F18D05',
  '#113F8C',
  '#61AE24',
  '#D70060',
];

function createTickFormat(
  intervalValue: string,
  timefilter: TimefilterContract,
  uiSettings: IUiSettingsClient
) {
  // Get the X-axis tick format
  const time: TimeRangeBounds = timefilter.getBounds();
  const interval = calculateInterval(
    (time.min && time.min.valueOf()) || 0,
    (time.max && time.max.valueOf()) || 0,
    uiSettings.get('timelion:target_buckets') || 200,
    intervalValue,
    uiSettings.get('timelion:min_interval') || '1ms'
  );
  const format = xaxisFormatterProvider(uiSettings)(interval);

  return (val: number) => moment(val).format(format);
}

export { createTickFormat, colors, activeCursor$ };
