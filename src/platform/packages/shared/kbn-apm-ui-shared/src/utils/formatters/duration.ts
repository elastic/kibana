/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { memoize, isFinite } from 'lodash';
import type { Maybe } from '@kbn/apm-types-shared';
import { asDecimalOrInteger, asInteger, NOT_AVAILABLE_LABEL } from './numeric';

export type TimeUnit = 'hours' | 'minutes' | 'seconds' | 'milliseconds';
type DurationTimeUnit = TimeUnit | 'microseconds';

interface FormatterOptions {
  defaultValue?: string;
}

interface ConvertedDuration {
  value: string;
  unit?: string;
  formatted: string;
}

export type TimeFormatter = (value: number, options?: FormatterOptions) => ConvertedDuration;

type TimeFormatterBuilder = (
  max: number,
  threshold?: number,
  scalingFactor?: number
) => TimeFormatter;

export const toMicroseconds = (value: number, timeUnit: TimeUnit) =>
  moment.duration(value, timeUnit).asMilliseconds() * 1000;

function getUnitLabelAndConvertedValue(
  unitKey: DurationTimeUnit,
  value: number,
  threshold: number = 10
) {
  const ms = value / 1000;

  switch (unitKey) {
    case 'hours': {
      return {
        unitLabel: i18n.translate('apmUiShared.formatters.duration.hoursTimeUnitLabel', {
          defaultMessage: 'h',
        }),
        convertedValue: asDecimalOrInteger(moment.duration(ms).asHours(), threshold),
      };
    }
    case 'minutes': {
      return {
        unitLabel: i18n.translate('apmUiShared.formatters.duration.minutesTimeUnitLabel', {
          defaultMessage: 'min',
        }),
        convertedValue: asDecimalOrInteger(moment.duration(ms).asMinutes(), threshold),
      };
    }
    case 'seconds': {
      return {
        unitLabel: i18n.translate('apmUiShared.formatters.duration.secondsTimeUnitLabel', {
          defaultMessage: 's',
        }),
        convertedValue: asDecimalOrInteger(moment.duration(ms).asSeconds(), threshold),
      };
    }
    case 'milliseconds': {
      return {
        unitLabel: i18n.translate('apmUiShared.formatters.duration.millisTimeUnitLabel', {
          defaultMessage: 'ms',
        }),
        convertedValue: asDecimalOrInteger(moment.duration(ms).asMilliseconds(), threshold),
      };
    }
    case 'microseconds': {
      return {
        unitLabel: i18n.translate('apmUiShared.formatters.duration.microsTimeUnitLabel', {
          defaultMessage: 'μs',
        }),
        convertedValue: asInteger(value),
      };
    }
  }
}

function convertTo({
  unit,
  microseconds,
  defaultValue = NOT_AVAILABLE_LABEL,
  threshold = 10,
}: {
  unit: DurationTimeUnit;
  microseconds: number;
  defaultValue?: string;
  threshold?: number;
}): ConvertedDuration {
  if (!isFinite(microseconds)) {
    return { value: defaultValue, formatted: defaultValue };
  }

  const { convertedValue, unitLabel } = getUnitLabelAndConvertedValue(
    unit,
    microseconds,
    threshold
  );

  return {
    value: convertedValue,
    unit: unitLabel,
    formatted: `${convertedValue} ${unitLabel}`,
  };
}

export function getDurationUnitKey(max: number, threshold = 10): DurationTimeUnit {
  if (max > toMicroseconds(threshold, 'hours')) {
    return 'hours';
  }
  if (max > toMicroseconds(threshold, 'minutes')) {
    return 'minutes';
  }
  if (max > toMicroseconds(threshold, 'seconds')) {
    return 'seconds';
  }
  if (max > toMicroseconds(1, 'milliseconds')) {
    return 'milliseconds';
  }
  return 'microseconds';
}

// memoizer with a custom resolver to consider both arguments max/threshold.
// by default lodash's memoize only considers the first argument.
export const getDurationFormatter: TimeFormatterBuilder = memoize(
  (max: number, threshold: number = 10, scalingFactor: number = 1) => {
    const unit = getDurationUnitKey(max, threshold);
    return (value: number, { defaultValue }: FormatterOptions = {}) => {
      return convertTo({
        unit,
        microseconds: isFinite(value) ? value * scalingFactor : value,
        defaultValue,
        threshold,
      });
    };
  },
  (max, threshold) => `${max}_${threshold}`
);

export function asDuration(
  value: Maybe<number>,
  { defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value === null || value === undefined || !isFinite(value)) {
    return defaultValue;
  }

  const formatter = getDurationFormatter(value);
  return formatter(value, { defaultValue }).formatted;
}
