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

import { Moment } from 'moment';
import { TimeRange } from './time_history';
import moment = require('moment');

// NOTE: These types are somewhat guessed, they may be incorrect.

export interface RefreshInterval {
  pause: boolean;
  value: number;
}

export interface Timefilter {
  time: {
    // NOTE: It's unclear if this is supposed to actually allow a moment object, or undefined, or if this is just
    // a bug... should be investigated.  This should probably be the TimeRange type, but most TimeRange interfaces
    // don't account for the possibility of the moment object, and it is actually a possibility.
    to: string | moment.Moment | undefined;
    from: string | moment.Moment | undefined;
  };
  getTime: () => {
    to: string | moment.Moment | undefined;
    from: string | moment.Moment | undefined;
  };
  setTime: (
    timeRange: {
      to: string | moment.Moment | undefined;
      from: string | moment.Moment | undefined;
    }
  ) => void;
  setRefreshInterval: (refreshInterval: RefreshInterval) => void;
  getRefreshInterval: () => RefreshInterval;
  disableAutoRefreshSelector: () => void;
  disableTimeRangeSelector: () => void;
  enableAutoRefreshSelector: () => void;
  off: (event: string, reload: () => void) => void;
  on: (event: string, reload: () => void) => void;
}

export const timefilter: Timefilter;
