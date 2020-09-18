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

import { TimefilterContract } from '../../../data/public';
import { TimeRange } from '../../../data/common';
import { CacheBounds } from './types';

/**
 * Optimization caching - always return the same value if queried within this time
 * @type {number}
 */

const AlwaysCacheMaxAge: number = 40;

/**
 * This class caches timefilter's bounds to minimize number of server requests
 */
export class TimeCache {
  _timefilter: TimefilterContract;
  _maxAge: number;
  _cachedBounds?: CacheBounds;
  _cacheTS: number;
  _timeRange?: TimeRange;

  constructor(timefilter: TimefilterContract, maxAge: number) {
    this._timefilter = timefilter;
    this._maxAge = maxAge;
    this._cacheTS = 0;
  }

  // Simplifies unit testing
  // noinspection JSMethodCanBeStatic
  _now(): number {
    return Date.now();
  }

  /**
   * Get cached time range values
   * @returns {{min: number, max: number}}
   */
  getTimeBounds(): CacheBounds {
    const ts = this._now();

    let bounds: CacheBounds | null = null;
    if (this._cachedBounds) {
      const diff = ts - this._cacheTS;

      // For very rapid usage (multiple calls within a few milliseconds)
      // Avoids expensive time parsing
      if (diff < AlwaysCacheMaxAge) {
        return this._cachedBounds;
      }

      // If the time is relative, mode hasn't changed, and time hasn't changed more than maxAge,
      // return old time to avoid multiple near-identical server calls
      if (diff < this._maxAge) {
        bounds = this._getBounds();
        if (
          Math.abs(bounds.min - this._cachedBounds.min) < this._maxAge &&
          Math.abs(bounds.max - this._cachedBounds.max) < this._maxAge
        ) {
          return this._cachedBounds;
        }
      }
    }

    this._cacheTS = ts;
    this._cachedBounds = bounds || this._getBounds();

    return this._cachedBounds;
  }

  setTimeRange(timeRange: TimeRange): void {
    this._timeRange = timeRange;
  }

  /**
   * Get parsed min/max values
   * @returns {{min: number, max: number}}
   * @private
   */
  _getBounds(): CacheBounds {
    const bounds = this._timefilter.calculateBounds(this._timeRange!);
    return {
      min: bounds.min!.valueOf(),
      max: bounds.max!.valueOf(),
    };
  }
}
