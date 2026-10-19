/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import moment from 'moment-timezone';
import type { EuiRangeTick } from '@elastic/eui';
import { ianaTimeZoneOrUtc, pickDateRounding } from '@kbn/es-date-rounding';

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

export function getInterval(min: number, max: number, timezone: string, steps = MAX_TICKS): number {
  const { nominalMs } = pickDateRounding(steps, {
    from: min,
    to: max,
    timeZone: ianaTimeZoneOrUtc(getMomentTimezone(timezone)),
  });
  const actualSteps = (max - min) / nominalMs;
  // 1y is the coarsest pick. A range longer than 20 years still overflows EuiRange.
  if (actualSteps > MAX_TICKS) {
    return nominalMs * Math.ceil(actualSteps / MAX_TICKS);
  }
  return nominalMs;
}

export function getTicks(min: number, max: number, timezone: string): EuiRangeTick[] {
  const interval = getInterval(min, max, timezone);
  const format = getScaledDateFormat(interval);

  let tickValue = Math.ceil(min / interval) * interval;
  const ticks: EuiRangeTick[] = [];
  while (tickValue <= max) {
    ticks.push({
      value: tickValue,
      label: moment.tz(tickValue, getMomentTimezone(timezone)).format(format),
    });
    tickValue += interval;
  }

  return ticks.length <= 12
    ? ticks
    : ticks.map((tick, index) => {
        return {
          ...tick,
          value: tick.value,
          // to avoid label overlap, only display even tick labels
          // Passing empty string as tick label results in tick not rendering, so must wrap empty label in react element
          label: index % 2 === 0 ? tick.label : <span>&nbsp;</span>,
        };
      });
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
