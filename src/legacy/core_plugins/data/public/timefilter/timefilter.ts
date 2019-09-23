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

import _ from 'lodash';
import { Subject, BehaviorSubject } from 'rxjs';
import moment from 'moment';
import { RefreshInterval, TimeRange } from 'src/plugins/data/public';
import { IndexPattern, TimeHistoryContract } from '../index';
import { areRefreshIntervalsDifferent, areTimeRangesDifferent } from './lib/diff_time_picker_vals';
import { parseQueryString } from './lib/parse_querystring';
import { calculateBounds, getTime } from './get_time';
import { TimefilterConfig, InputTimeRange } from './types';

export class Timefilter {
  // Fired when isTimeRangeSelectorEnabled \ isAutoRefreshSelectorEnabled are toggled
  private enabledUpdated$ = new BehaviorSubject(false);
  // Fired when a user changes the timerange
  private timeUpdate$ = new Subject();
  // Fired when a user changes the the autorefresh settings
  private refreshIntervalUpdate$ = new Subject();
  // Used when search poll triggers an auto refresh
  private autoRefreshFetch$ = new Subject();
  private fetch$ = new Subject();

  private _time: TimeRange;
  private _refreshInterval!: RefreshInterval;
  private _history: TimeHistoryContract;

  private isTimeRangeSelectorEnabled: boolean = false;
  private isAutoRefreshSelectorEnabled: boolean = false;

  constructor(config: TimefilterConfig, timeHistory: TimeHistoryContract) {
    this._history = timeHistory;
    this._time = config.timeDefaults;
    this.setRefreshInterval(config.refreshIntervalDefaults);
  }

  public getIsTimeRangeSelectorEnabled() {
    return this.isTimeRangeSelectorEnabled;
  }

  public getIsAutoRefreshSelectorEnabled() {
    return this.isAutoRefreshSelectorEnabled;
  }

  public getEnabledUpdated$ = () => {
    return this.enabledUpdated$.asObservable();
  };

  public getTimeUpdate$ = () => {
    return this.timeUpdate$.asObservable();
  };

  public getRefreshIntervalUpdate$ = () => {
    return this.refreshIntervalUpdate$.asObservable();
  };

  public getAutoRefreshFetch$ = () => {
    return this.autoRefreshFetch$.asObservable();
  };

  public getFetch$ = () => {
    return this.fetch$.asObservable();
  };

  public getTime = (): TimeRange => {
    const { from, to } = this._time;
    return {
      ...this._time,
      from: moment.isMoment(from) ? from.toISOString() : from,
      to: moment.isMoment(to) ? to.toISOString() : to,
    };
  };

  /**
   * Updates timefilter time.
   * Emits 'timeUpdate' and 'fetch' events when time changes
   * @param {Object} time
   * @property {string|moment} time.from
   * @property {string|moment} time.to
   */
  public setTime = (time: InputTimeRange) => {
    // Object.assign used for partially composed updates
    const newTime = Object.assign(this.getTime(), time);
    if (areTimeRangesDifferent(this.getTime(), newTime)) {
      this._time = {
        from: newTime.from,
        to: newTime.to,
      };
      this._history.add(this._time);
      this.timeUpdate$.next();
      this.fetch$.next();
    }
  };

  public getRefreshInterval = () => {
    return _.clone(this._refreshInterval);
  };

  /**
   * Set timefilter refresh interval.
   * @param {Object} refreshInterval
   * @property {number} time.value Refresh interval in milliseconds. Positive integer
   * @property {boolean} time.pause
   */
  public setRefreshInterval = (refreshInterval: Partial<RefreshInterval>) => {
    const prevRefreshInterval = this.getRefreshInterval();
    const newRefreshInterval = { ...prevRefreshInterval, ...refreshInterval };
    // If the refresh interval is <= 0 handle that as a paused refresh
    if (newRefreshInterval.value <= 0) {
      newRefreshInterval.value = 0;
      newRefreshInterval.pause = true;
    }
    this._refreshInterval = {
      value: newRefreshInterval.value,
      pause: newRefreshInterval.pause,
    };
    // Only send out an event if we already had a previous refresh interval (not for the initial set)
    // and the old and new refresh interval are actually different.
    if (
      prevRefreshInterval &&
      areRefreshIntervalsDifferent(prevRefreshInterval, newRefreshInterval)
    ) {
      this.refreshIntervalUpdate$.next();
      if (!newRefreshInterval.pause && newRefreshInterval.value !== 0) {
        this.fetch$.next();
      }
    }
  };

  public createFilter = (indexPattern: IndexPattern, timeRange?: TimeRange) => {
    return getTime(indexPattern, timeRange ? timeRange : this._time, this.getForceNow());
  };

  public getBounds = () => {
    return this.calculateBounds(this._time);
  };

  public calculateBounds = (timeRange: TimeRange) => {
    return calculateBounds(timeRange, { forceNow: this.getForceNow() });
  };

  public getActiveBounds = () => {
    if (this.isTimeRangeSelectorEnabled) {
      return this.getBounds();
    }
  };

  /**
   * Show the time bounds selector part of the time filter
   */
  public enableTimeRangeSelector = () => {
    this.isTimeRangeSelectorEnabled = true;
    this.enabledUpdated$.next(true);
  };

  /**
   * Hide the time bounds selector part of the time filter
   */
  public disableTimeRangeSelector = () => {
    this.isTimeRangeSelectorEnabled = false;
    this.enabledUpdated$.next(false);
  };

  /**
   * Show the auto refresh part of the time filter
   */
  public enableAutoRefreshSelector = () => {
    this.isAutoRefreshSelectorEnabled = true;
    this.enabledUpdated$.next(true);
  };

  /**
   * Hide the auto refresh part of the time filter
   */
  public disableAutoRefreshSelector = () => {
    this.isAutoRefreshSelectorEnabled = false;
    this.enabledUpdated$.next(false);
  };

  /**
   * Added to allow search_poll to trigger an auto refresh event.
   * Before this change, search_poll used to access a now private member of this instance.
   */
  public notifyShouldFetch = () => {
    this.autoRefreshFetch$.next();
  };

  private getForceNow = () => {
    const forceNow = parseQueryString().forceNow as string;
    if (!forceNow) {
      return;
    }

    const ticks = Date.parse(forceNow);
    if (isNaN(ticks)) {
      throw new Error(`forceNow query parameter, ${forceNow}, can't be parsed by Date.parse`);
    }
    return new Date(ticks);
  };
}

export type TimefilterContract = PublicMethodsOf<Timefilter>;
