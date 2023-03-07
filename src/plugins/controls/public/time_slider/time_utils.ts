/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { EuiRangeTick } from '@elastic/eui';
import { calcAutoIntervalNear } from '@kbn/data-plugin/common';

const MAX_TICKS = 20; // eui range has hard limit of 20 ticks and throws when exceeded

export const FROM_INDEX = 0;
export const TO_INDEX = 1;

export function getMomentTimezone(dateFormatTZ: string) {
  const detectedTimezone = moment.tz.guess();
  return dateFormatTZ === undefined || dateFormatTZ === 'Browser' ? detectedTimezone : dateFormatTZ;
}

function getScaledDateFormat(interval: number): string {
  if (interval >= moment.duration(1, 'y').asMilliseconds()) {
    return 'YYYY';
  }

  if (interval >= moment.duration(30, 'd').asMilliseconds()) {
    return 'MMM YYYY';
  }

  if (interval >= moment.duration(1, 'd').asMilliseconds()) {
    return 'MMM D';
  }

  if (interval >= moment.duration(6, 'h').asMilliseconds()) {
    return 'Do HH';
  }

  if (interval >= moment.duration(1, 'h').asMilliseconds()) {
    return 'HH:mm';
  }

  if (interval >= moment.duration(1, 'm').asMilliseconds()) {
    return 'HH:mm';
  }

  if (interval >= moment.duration(1, 's').asMilliseconds()) {
    return 'mm:ss';
  }

  return 'ss.SSS';
}

export function getInterval(min: number, max: number, steps = MAX_TICKS): number {
  const duration = max - min;
  let interval = calcAutoIntervalNear(MAX_TICKS, duration).asMilliseconds();
  // Sometimes auto interval is not quite right and returns 2X, 3X, 1/2X, or 1/3X  requested ticks
  const actualSteps = duration / interval;
  if (actualSteps > MAX_TICKS) {
    // EuiRange throws if ticks exceeds MAX_TICKS
    // Adjust the interval to ensure MAX_TICKS is never exceeded
    const factor = Math.ceil(actualSteps / MAX_TICKS);
    interval = interval * factor;
  } else if (actualSteps < MAX_TICKS / 2) {
    // Increase number of ticks when ticks is less then half MAX_TICKS
    interval = interval / 2;
  }
  return interval;
}

export function getTicks(min: number, max: number, timezone: string): EuiRangeTick[] {
  const interval = getInterval(min, max);
  const format = getScaledDateFormat(interval);

  let tick = Math.ceil(min / interval) * interval;
  const ticks: EuiRangeTick[] = [];
  while (tick <= max) {
    ticks.push({
      value: tick,
      label: moment.tz(tick, getMomentTimezone(timezone)).format(format),
    });
    tick += interval;
  }

  return ticks;
}

export function getStepSize(ticks: EuiRangeTick[]): {
  stepSize: number;
  format: string;
} {
  if (ticks.length < 2) {
    return {
      stepSize: 1,
      format: 'MMM D, YYYY @ HH:mm:ss.SSS',
    };
  }

  const tickRange = ticks[1].value - ticks[0].value;

  if (tickRange >= moment.duration(2, 'y').asMilliseconds()) {
    return {
      stepSize: moment.duration(1, 'y').asMilliseconds(),
      format: 'YYYY',
    };
  }

  if (tickRange >= moment.duration(2, 'd').asMilliseconds()) {
    return {
      stepSize: moment.duration(1, 'd').asMilliseconds(),
      format: 'MMM D, YYYY',
    };
  }

  if (tickRange >= moment.duration(2, 'h').asMilliseconds()) {
    return {
      stepSize: moment.duration(1, 'h').asMilliseconds(),
      format: 'MMM D, YYYY @ HH:mm',
    };
  }

  if (tickRange >= moment.duration(2, 'm').asMilliseconds()) {
    return {
      stepSize: moment.duration(1, 'm').asMilliseconds(),
      format: 'MMM D, YYYY @ HH:mm',
    };
  }

  if (tickRange >= moment.duration(2, 's').asMilliseconds()) {
    return {
      stepSize: moment.duration(1, 's').asMilliseconds(),
      format: 'MMM D, YYYY @ HH:mm:ss',
    };
  }

  return {
    stepSize: 1,
    format: 'MMM D, YYYY @ HH:mm:ss.SSS',
  };
}

export function roundDownToNextStepSizeFactor(value: number, stepSize: number) {
  const remainder = value % stepSize;
  return remainder === 0 ? value : value - remainder;
}

export function roundUpToNextStepSizeFactor(value: number, stepSize: number) {
  const remainder = value % stepSize;
  return remainder === 0 ? value : value + (stepSize - remainder);
}
