/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Subject } from 'rxjs';
import moment, { Moment } from 'moment-timezone';
import { Position } from '@elastic/charts';

import { TimefilterContract } from 'src/plugins/data/public';
import { IUiSettingsClient } from 'kibana/public';

import { calculateInterval } from '../../common/lib';
import { xaxisFormatterProvider } from './xaxis_formatter';

export interface Axis {
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
  tickGenerator?(axis: Axis): number[];
  units?: { type: string };
  domain?: {
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

export interface TimelionEvent {
  name: string;
  data?: any;
}

const ACTIVE_CURSOR = 'ACTIVE_CURSOR_TIMELION';
const eventBus = new Subject<TimelionEvent>();

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

export { createTickFormat, colors, ACTIVE_CURSOR, eventBus };
