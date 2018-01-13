/**
 * Optimization caching - always return the same value if queried within this time
 * @type {number}
 */
const AlwaysCacheMaxAge = 40;

/**
 * This class caches timefilter's bounds to minimize number of server requests
 */
export class TimeCache {

  constructor(timefilter, maxAge) {
    this._timefilter = timefilter;
    this._maxAge = maxAge;
    this._cachedBounds = null;
    this._cacheTS = 0;
  }

  // Simplifies unit testing
  // noinspection JSMethodCanBeStatic
  _now() {
    return Date.now();
  }

  /**
   * Get cached time range values
   * @returns {{min: number, max: number}}
   */
  getTimeBounds() {
    const ts = this._now();

    let bounds;
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
          (Math.abs(bounds.min - this._cachedBounds.min) < this._maxAge) &&
          (Math.abs(bounds.max - this._cachedBounds.max) < this._maxAge)
        ) {
          return this._cachedBounds;
        }
      }
    }

    this._cacheTS = ts;
    this._cachedBounds = bounds || this._getBounds();

    return this._cachedBounds;
  }

  /**
   * Get parsed min/max values
   * @returns {{min: number, max: number}}
   * @private
   */
  _getBounds() {
    const bounds = this._timefilter.getBounds();
    return {
      min: bounds.min.valueOf(),
      max: bounds.max.valueOf()
    };
  }
}
