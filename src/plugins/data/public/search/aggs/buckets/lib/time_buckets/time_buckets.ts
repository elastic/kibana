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

import { isString, isObject as isObjectLodash, isPlainObject, sortBy } from 'lodash';
import moment, { Moment } from 'moment';

import { parseInterval } from '../../../../../../common';
import { TimeRangeBounds } from '../../../../../query';
import { calcAutoIntervalLessThan, calcAutoIntervalNear } from './calc_auto_interval';
import {
  convertDurationToNormalizedEsInterval,
  convertIntervalToEsInterval,
  EsInterval,
} from './calc_es_interval';

interface TimeBucketsInterval extends moment.Duration {
  // TODO double-check whether all of these are needed
  description: string;
  esValue: EsInterval['value'];
  esUnit: EsInterval['unit'];
  expression: EsInterval['expression'];
  preScaled?: TimeBucketsInterval;
  scale?: number;
  scaled?: boolean;
}

function isObject(o: any): o is Record<string, any> {
  return isObjectLodash(o);
}

function isValidMoment(m: any): boolean {
  return m && 'isValid' in m && m.isValid();
}

export interface TimeBucketsConfig extends Record<string, any> {
  'histogram:maxBars': number;
  'histogram:barTarget': number;
  dateFormat: string;
  'dateFormat:scaled': string[][];
}

/**
 * Helper class for wrapping the concept of an "Interval",
 * which describes a timespan that will separate moments.
 *
 * @param {state} object - one of ""
 * @param {[type]} display [description]
 */
export class TimeBuckets {
  private _timeBucketConfig: TimeBucketsConfig;
  private _lb: TimeRangeBounds['min'];
  private _ub: TimeRangeBounds['max'];
  private _originalInterval: string | null = null;
  private _i?: moment.Duration | 'auto';

  // because other parts of Kibana arbitrarily add properties
  [key: string]: any;

  constructor(timeBucketConfig: TimeBucketsConfig) {
    this._timeBucketConfig = timeBucketConfig;
  }

  /**
   * Get a moment duration object representing
   * the distance between the bounds, if the bounds
   * are set.
   *
   * @return {moment.duration|undefined}
   */
  private getDuration(): moment.Duration | undefined {
    if (this._ub === undefined || this._lb === undefined || !this.hasBounds()) {
      return;
    }
    const difference = this._ub.valueOf() - this._lb.valueOf();
    return moment.duration(difference, 'ms');
  }

  /**
   * Set the bounds that these buckets are expected to cover.
   * This is required to support interval "auto" as well
   * as interval scaling.
   *
   * @param {object} input - an object with properties min and max,
   *                       representing the edges for the time span
   *                       we should cover
   *
   * @returns {undefined}
   */
  setBounds(input?: TimeRangeBounds | TimeRangeBounds[]) {
    if (!input) return this.clearBounds();

    let bounds;
    if (isPlainObject(input) && !Array.isArray(input)) {
      // accept the response from timefilter.getActiveBounds()
      bounds = [input.min, input.max];
    } else {
      bounds = Array.isArray(input) ? input : [];
    }

    const moments: Moment[] = sortBy(bounds, Number) as Moment[];

    const valid = moments.length === 2 && moments.every(isValidMoment);
    if (!valid) {
      this.clearBounds();
      throw new Error('invalid bounds set: ' + input);
    }

    this._lb = moments.shift() as any;
    this._ub = moments.pop() as any;

    const duration = this.getDuration();
    if (!duration || duration.asSeconds() < 0) {
      throw new TypeError('Intervals must be positive');
    }
  }

  /**
   * Clear the stored bounds
   *
   * @return {undefined}
   */
  clearBounds() {
    this._lb = this._ub = undefined;
  }

  /**
   * Check to see if we have received bounds yet
   *
   * @return {Boolean}
   */
  hasBounds(): boolean {
    return isValidMoment(this._ub) && isValidMoment(this._lb);
  }

  /**
   * Return the current bounds, if we have any.
   *
   * THIS DOES NOT CLONE THE BOUNDS, so editing them
   * may have unexpected side-effects. Always
   * call bounds.min.clone() before editing
   *
   * @return {object|undefined} - If bounds are not defined, this
   *                      returns undefined, else it returns the bounds
   *                      for these buckets. This object has two props,
   *                      min and max. Each property will be a moment()
   *                      object
   *
   */
  getBounds(): TimeRangeBounds | undefined {
    if (!this.hasBounds()) return;
    return {
      min: this._lb,
      max: this._ub,
    };
  }

  /**
   * Update the interval at which buckets should be
   * generated.
   *
   * Input can be one of the following:
   *  - Any object from src/legacy/ui/agg_types.js
   *  - "auto"
   *  - Pass a valid moment unit
   *
   * @param {object|string|moment.duration} input - see desc
   */
  setInterval(input: null | string | Record<string, any>) {
    let interval = input;

    // selection object -> val
    if (isObject(input) && !moment.isDuration(input)) {
      interval = input.val;
    }

    if (!interval || interval === 'auto') {
      this._i = 'auto';
      return;
    }

    if (isString(interval)) {
      input = interval;

      // Preserve the original units because they're lost when the interval is converted to a
      // moment duration object.
      this._originalInterval = input;

      interval = parseInterval(interval);
      if (interval === null || +interval === 0) {
        interval = null;
      }
    }

    // if the value wasn't converted to a duration, and isn't
    // already a duration, we have a problem
    if (!moment.isDuration(interval)) {
      throw new TypeError('"' + input + '" is not a valid interval.');
    }

    this._i = interval;
  }

  /**
   * Get the interval for the buckets. If the
   * number of buckets created by the interval set
   * is larger than config:histogram:maxBars then the
   * interval will be scaled up. If the number of buckets
   * created is less than one, the interval is scaled back.
   *
   * The interval object returned is a moment.duration
   * object that has been decorated with the following
   * properties.
   *
   * interval.description: a text description of the interval.
   *   designed to be used list "field per {{ desc }}".
   *     - "minute"
   *     - "10 days"
   *     - "3 years"
   *
   * interval.expression: the elasticsearch expression that creates this
   *   interval. If the interval does not properly form an elasticsearch
   *   expression it will be forced into one.
   *
   * interval.scaled: the interval was adjusted to
   *   accommodate the maxBars setting.
   *
   * interval.scale: the number that y-values should be
   *   multiplied by
   */
  getInterval(useNormalizedEsInterval = true): TimeBucketsInterval {
    const duration = this.getDuration();

    // either pull the interval from state or calculate the auto-interval
    const readInterval = () => {
      const interval = this._i;
      if (moment.isDuration(interval)) return interval;
      return calcAutoIntervalNear(this._timeBucketConfig['histogram:barTarget'], Number(duration));
    };

    const parsedInterval = readInterval();

    // check to see if the interval should be scaled, and scale it if so
    const maybeScaleInterval = (interval: moment.Duration) => {
      if (!this.hasBounds() || !duration) {
        return interval;
      }

      const maxLength: number = this._timeBucketConfig['histogram:maxBars'];
      const approxLen = Number(duration) / Number(interval);

      let scaled;

      if (approxLen > maxLength) {
        scaled = calcAutoIntervalLessThan(maxLength, Number(duration));
      } else {
        return interval;
      }

      if (+scaled === +interval) return interval;

      interval = decorateInterval(interval);
      return Object.assign(scaled, {
        preScaled: interval,
        scale: Number(interval) / Number(scaled),
        scaled: true,
      });
    };

    // append some TimeBuckets specific props to the interval
    const decorateInterval = (interval: moment.Duration): TimeBucketsInterval => {
      const esInterval = useNormalizedEsInterval
        ? convertDurationToNormalizedEsInterval(interval)
        : convertIntervalToEsInterval(String(this._originalInterval));
      const prettyUnits = moment.normalizeUnits(esInterval.unit);

      return Object.assign(interval, {
        description:
          esInterval.value === 1 ? prettyUnits : esInterval.value + ' ' + prettyUnits + 's',
        esValue: esInterval.value,
        esUnit: esInterval.unit,
        expression: esInterval.expression,
      });
    };

    if (useNormalizedEsInterval) {
      return decorateInterval(maybeScaleInterval(parsedInterval));
    } else {
      return decorateInterval(parsedInterval);
    }
  }

  /**
   * Get a date format string that will represent dates that
   * progress at our interval.
   *
   * Since our interval can be as small as 1ms, the default
   * date format is usually way too much. with `dateFormat:scaled`
   * users can modify how dates are formatted within series
   * produced by TimeBuckets
   *
   * @return {string}
   */
  getScaledDateFormat() {
    const interval = this.getInterval();
    const rules = this._timeBucketConfig['dateFormat:scaled'];

    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (!rule[0] || (interval && interval >= moment.duration(rule[0]))) {
        return rule[1];
      }
    }

    return this._timeBucketConfig.dateFormat;
  }
}
