/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimefilterContract } from '@kbn/data-plugin/public';
import { TimeRange } from '@kbn/data-plugin/common';
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
