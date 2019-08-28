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
import { Observable } from 'rxjs';
import { TimeRange } from './time_history';
import { RefreshInterval } from '../../../../plugins/data/public';

// NOTE: These types are somewhat guessed, they may be incorrect.

export { RefreshInterval, TimeRange };

export interface Timefilter {
  time: TimeRange;
  getEnabledUpdated$: () => Observable<any>;
  getTimeUpdate$: () => Observable<any>;
  getRefreshIntervalUpdate$: () => Observable<any>;
  getAutoRefreshFetch$: () => Observable<any>;
  getFetch$: () => Observable<any>;
  getTime: () => TimeRange;
  setTime: (timeRange: TimeRange) => void;
  setRefreshInterval: (refreshInterval: RefreshInterval) => void;
  getRefreshInterval: () => RefreshInterval;
  getActiveBounds: () => void;
  disableAutoRefreshSelector: () => void;
  disableTimeRangeSelector: () => void;
  enableAutoRefreshSelector: () => void;
  enableTimeRangeSelector: () => void;
  isAutoRefreshSelectorEnabled: boolean;
  isTimeRangeSelectorEnabled: boolean;
}

export const timefilter: Timefilter;
