/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { Subject, BehaviorSubject } from 'rxjs';
import moment from 'moment';
import { PublicMethodsOf } from '@kbn/utility-types';
import { areRefreshIntervalsDifferent, areTimeRangesDifferent } from './lib/diff_time_picker_vals';
import type { TimefilterConfig, InputTimeRange, TimeRangeBounds } from './types';
import { NowProviderInternalContract } from '../../now_provider';
import {
  calculateBounds,
  getAbsoluteTimeRange,
  getTime,
  getRelativeTime,
  IIndexPattern,
  RefreshInterval,
  TimeRange,
} from '../../../common';
import { TimeHistoryContract } from './time_history';
import { createAutoRefreshLoop, AutoRefreshDoneFn } from './lib/auto_refresh_loop';

export type { AutoRefreshDoneFn };

// TODO: remove!
export class Timefilter {
  // Fired when isTimeRangeSelectorEnabled \ isAutoRefreshSelectorEnabled are toggled
  private enabledUpdated$ = new BehaviorSubject(false);
  // Fired when a user changes the timerange
  private timeUpdate$ = new Subject<void>();
  // Fired when a user changes the the autorefresh settings
  private refreshIntervalUpdate$ = new Subject<void>();
  private fetch$ = new Subject<void>();

  private _time: TimeRange;
  // Denotes whether setTime has been called, can be used to determine if the constructor defaults are being used.
  private _isTimeTouched: boolean = false;
  private _refreshInterval!: RefreshInterval;
  private _history: TimeHistoryContract;

  private _isTimeRangeSelectorEnabled: boolean = false;
  private _isAutoRefreshSelectorEnabled: boolean = false;

  private readonly timeDefaults: TimeRange;
  private readonly refreshIntervalDefaults: RefreshInterval;

  // Used when an auto refresh is triggered
  private readonly autoRefreshLoop = createAutoRefreshLoop();

  constructor(
    config: TimefilterConfig,
    timeHistory: TimeHistoryContract,
    private readonly nowProvider: NowProviderInternalContract
  ) {
    this._history = timeHistory;
    this.timeDefaults = config.timeDefaults;
    this.refreshIntervalDefaults = config.refreshIntervalDefaults;
    this._time = config.timeDefaults;
    this.setRefreshInterval(config.refreshIntervalDefaults);
  }

  public isTimeRangeSelectorEnabled() {
    return this._isTimeRangeSelectorEnabled;
  }

  public isAutoRefreshSelectorEnabled() {
    return this._isAutoRefreshSelectorEnabled;
  }

  public isTimeTouched() {
    return this._isTimeTouched;
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

  /**
   * Get an observable that emits when it is time to refetch data due to refresh interval
   * Each subscription to this observable resets internal interval
   * Emitted value is a callback {@link AutoRefreshDoneFn} that must be called to restart refresh interval loop
   * Apps should use this callback to start next auto refresh loop when view finished updating
   */
  public getAutoRefreshFetch$ = () => this.autoRefreshLoop.loop$;

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
   * Same as {@link getTime}, but also converts relative time range to absolute time range
   */
  public getAbsoluteTime() {
    return getAbsoluteTimeRange(this._time, { forceNow: this.nowProvider.get() });
  }

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
      this._isTimeTouched = true;
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
    let shouldUnpauseRefreshLoop =
      newRefreshInterval.pause === false && prevRefreshInterval != null;
    if (prevRefreshInterval?.value > 0 && newRefreshInterval.value <= 0) {
      shouldUnpauseRefreshLoop = false;
    }
    // If the refresh interval is <= 0 handle that as a paused refresh
    // unless the user has un-paused the refresh loop and the value is not going from > 0 to 0
    if (newRefreshInterval.value <= 0) {
      newRefreshInterval.value = 0;
      newRefreshInterval.pause = shouldUnpauseRefreshLoop ? false : true;
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

    this.autoRefreshLoop.stop();
    if (!newRefreshInterval.pause && newRefreshInterval.value !== 0) {
      this.autoRefreshLoop.start(newRefreshInterval.value);
    }
  };

  /**
   * Create a time filter that coerces all time values to absolute time.
   *
   * This is useful for creating a filter that ensures all ES queries will fetch the exact same data
   * and leverages ES query cache for performance improvement.
   *
   * One use case is keeping different elements embedded in the same UI in sync.
   */
  public createFilter = (indexPattern: IIndexPattern, timeRange?: TimeRange) => {
    return getTime(indexPattern, timeRange ? timeRange : this._time, {
      forceNow: this.nowProvider.get(),
    });
  };

  /**
   * Create a time filter that converts only absolute time to ISO strings, it leaves relative time
   * values unchanged (e.g. "now-1").
   *
   * This is useful for sending datemath values to ES endpoints to generate reports over time.
   *
   * @note Consumers of this function need to ensure that the ES endpoint supports datemath.
   */
  public createRelativeFilter = (indexPattern: IIndexPattern, timeRange?: TimeRange) => {
    return getRelativeTime(indexPattern, timeRange ? timeRange : this._time, {
      forceNow: this.nowProvider.get(),
    });
  };

  public getBounds(): TimeRangeBounds {
    return this.calculateBounds(this._time);
  }

  public calculateBounds(timeRange: TimeRange): TimeRangeBounds {
    return calculateBounds(timeRange, { forceNow: this.nowProvider.get() });
  }

  public getActiveBounds(): TimeRangeBounds | undefined {
    if (this.isTimeRangeSelectorEnabled()) {
      return this.getBounds();
    }
  }

  /**
   * Show the time bounds selector part of the time filter
   */
  public enableTimeRangeSelector = () => {
    this._isTimeRangeSelectorEnabled = true;
    this.enabledUpdated$.next(true);
  };

  /**
   * Hide the time bounds selector part of the time filter
   */
  public disableTimeRangeSelector = () => {
    this._isTimeRangeSelectorEnabled = false;
    this.enabledUpdated$.next(false);
  };

  /**
   * Show the auto refresh part of the time filter
   */
  public enableAutoRefreshSelector = () => {
    this._isAutoRefreshSelectorEnabled = true;
    this.enabledUpdated$.next(true);
  };

  /**
   * Hide the auto refresh part of the time filter
   */
  public disableAutoRefreshSelector = () => {
    this._isAutoRefreshSelectorEnabled = false;
    this.enabledUpdated$.next(false);
  };

  public getTimeDefaults(): TimeRange {
    return _.cloneDeep(this.timeDefaults);
  }

  public getRefreshIntervalDefaults(): RefreshInterval {
    return _.cloneDeep(this.refreshIntervalDefaults);
  }
}

export type TimefilterContract = PublicMethodsOf<Timefilter>;
