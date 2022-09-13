/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { EuiRangeTick } from '@elastic/eui/src/components/form/range/range_ticks';
import { calcAutoIntervalNear } from '@kbn/data-plugin/common';

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

export function getInterval(min: number, max: number, steps = 6): number {
  const duration = max - min;
  let interval = calcAutoIntervalNear(steps, duration).asMilliseconds();
  // Sometimes auto interval is not quite right and returns 2X or 3X requested ticks
  // Adjust the interval to get closer to the requested number of ticks
  const actualSteps = duration / interval;
  if (actualSteps > steps * 1.5) {
    const factor = Math.round(actualSteps / steps);
    interval *= factor;
  } else if (actualSteps < 5) {
    interval *= 0.5;
  }
  return interval;
}

export function getTicks(min: number, max: number, timezone: string): EuiRangeTick[] {
  const interval = getInterval(min, max);
  const format = getScaledDateFormat(interval);

  let tick = Math.ceil(min / interval) * interval;
  const ticks: EuiRangeTick[] = [];
  while (tick < max) {
    ticks.push({
      value: tick,
      label: moment.tz(tick, getMomentTimezone(timezone)).format(format),
    });
    tick += interval;
  }

  return ticks;
}
