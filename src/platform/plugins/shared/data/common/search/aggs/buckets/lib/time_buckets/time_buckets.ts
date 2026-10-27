/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Assign } from 'utility-types';
import { isString, isObject as isObjectLodash, isPlainObject, sortBy } from 'lodash';
import type { Moment } from 'moment';
import moment from 'moment';

import { getAutoDateBucketTarget } from '@kbn/data-service';
import type { Unit } from '@kbn/datemath';
import type { DateInterval, IanaTimeZone, ZonedDateRange } from '@kbn/es-date-rounding';
import { fitsInBuckets, ianaTimeZoneOrUtc, pickDateRounding } from '@kbn/es-date-rounding';
import { parseEsInterval, parseInterval, splitStringInterval } from '../../../utils';
import type { TimeRangeBounds } from '../../../../../query';
import type { EsInterval } from './calc_es_interval';
import {
  convertDurationToNormalizedEsInterval,
  convertIntervalToEsInterval,
  getPreciseDurationDescription,
} from './calc_es_interval';
import { autoInterval } from '../../_interval_options';

export interface TimeBucketsInterval extends moment.Duration {
  // TODO double-check whether all of these are needed
  description: string;
  esValue: EsInterval['value'];
  esUnit: EsInterval['unit'];
  expression: EsInterval['expression'];
  forceFixed?: boolean;
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

function isDurationInterval(i: any): i is moment.Duration {
  return moment.isDuration(i) && Boolean(+i);
}

function resolveIanaTimeZone(min: TimeRangeBounds['min'], configuredTz?: string): IanaTimeZone {
  if (configuredTz) {
    return ianaTimeZoneOrUtc(configuredTz);
  }
  const zoned = min as { tz?: () => string | undefined } | undefined;
  const id = typeof zoned?.tz === 'function' ? zoned.tz() : undefined;
  return ianaTimeZoneOrUtc(id);
}

function toZonedRange(min: Moment, max: Moment, configuredTz?: string): ZonedDateRange {
  return {
    from: min.valueOf(),
    to: max.valueOf(),
    timeZone: resolveIanaTimeZone(min, configuredTz),
  };
}

function toPickerInterval(
  duration: moment.Duration,
  originalInterval: string | null
): DateInterval {
  const fromDuration = convertDurationToNormalizedEsInterval(duration);
  let expression = fromDuration.expression;
  if (originalInterval) {
    try {
      const parsed = parseEsInterval(originalInterval);
      // parseEsInterval allows '1 h' and ' 20m '; the picker requires a compact expression.
      expression = `${parsed.value}${parsed.unit}`;
    } catch {
      // setInterval accepts unit-only strings such as 'ms'; the picker needs a numeric ES expression.
    }
  }
  const { type, unit } = parseEsInterval(expression);
  // parseEsInterval classifies 1m/1h as calendar; the ES picker counts them as fixed TimeValues.
  const kind: DateInterval['kind'] =
    unit === 'm' || unit === 'h' || type === 'fixed' ? 'fixed' : 'calendar';
  return {
    expression,
    kind,
    nominalMs: Number(duration),
  };
}

function decoratePicked(picked: DateInterval): TimeBucketsInterval {
  const split = splitStringInterval(picked.expression);
  const esValue = split?.value ?? 0;
  const esUnit = (split?.unit ?? 'ms') as EsInterval['unit'];
  const prettyUnits = moment.normalizeUnits(esUnit) as moment.unitOfTime.Base;
  return Object.assign(moment.duration(picked.nominalMs), {
    description: getPreciseDurationDescription(esValue, prettyUnits),
    esValue,
    esUnit,
    expression: picked.expression,
    ...(picked.kind === 'fixed' ? { forceFixed: true } : {}),
  });
}

export interface TimeBucketsConfig extends Record<string, any> {
  'histogram:maxBars': number;
  'histogram:barTarget': number;
  dateFormat: string;
  'dateFormat:scaled': string[][];
  'dateFormat:tz'?: string;
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
    this._originalInterval = null;
    this._i = isObject(input) ? input.val : input;

    if (!this._i || this._i === autoInterval) {
      this._i = autoInterval;
      return;
    }

    if (isString(this._i)) {
      const parsedInterval = parseInterval(this._i);

      if (isDurationInterval(parsedInterval)) {
        this._originalInterval = this._i;
        this._i = parsedInterval;
      }
    }

    if (!isDurationInterval(this._i)) {
      throw new TypeError('"' + this._i + '" is not a valid interval.');
    }
  }

  /**
   * Get the interval for the buckets. Auto uses histogram:barTarget and is never scaled.
   * Manual intervals that exceed histogram:maxBars are replaced with a coarser picker interval.
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
    const decorateInterval = (
      interval: Assign<moment.Duration, { scaled?: boolean }>
    ): TimeBucketsInterval => {
      let originalUnit: Unit | undefined;

      if (!interval.scaled && this._originalInterval) {
        originalUnit = splitStringInterval(this._originalInterval!)?.unit;
      }

      const esInterval =
        useNormalizedEsInterval || !this._originalInterval
          ? convertDurationToNormalizedEsInterval(interval, originalUnit)
          : convertIntervalToEsInterval(this._originalInterval);

      const prettyUnits = moment.normalizeUnits(esInterval.unit) as moment.unitOfTime.Base;
      const durationDescription = getPreciseDurationDescription(esInterval.value, prettyUnits);

      return Object.assign(interval, {
        description: durationDescription,
        esValue: esInterval.value,
        esUnit: esInterval.unit,
        expression: esInterval.expression,
      });
    };

    if (!isDurationInterval(this._i)) {
      if (
        !this.hasBounds() ||
        this._lb == null ||
        this._ub == null ||
        this._lb.valueOf() >= this._ub.valueOf()
      ) {
        return decorateInterval(moment.duration(0));
      }
      const picked = pickDateRounding(
        getAutoDateBucketTarget(
          (key, defaultOverride) => this._timeBucketConfig[key] ?? defaultOverride
        ),
        toZonedRange(this._lb, this._ub, this._timeBucketConfig['dateFormat:tz'])
      );
      return decoratePicked(picked);
    }

    if (
      useNormalizedEsInterval &&
      this.hasBounds() &&
      this._lb != null &&
      this._ub != null &&
      this._lb.valueOf() < this._ub.valueOf()
    ) {
      const range = toZonedRange(this._lb, this._ub, this._timeBucketConfig['dateFormat:tz']);
      const maxBars = this._timeBucketConfig['histogram:maxBars'];
      const manual = toPickerInterval(this._i, this._originalInterval);
      if (!fitsInBuckets(manual, range, maxBars)) {
        const scaled = decoratePicked(pickDateRounding(maxBars, range));
        const preScaled = decorateInterval(this._i);
        return Object.assign(scaled, {
          preScaled,
          scale: Number(preScaled) / Number(scaled),
          scaled: true,
        });
      }
    }

    return decorateInterval(this._i);
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
