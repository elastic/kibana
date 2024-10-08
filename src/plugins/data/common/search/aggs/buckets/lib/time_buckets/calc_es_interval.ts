/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import dateMath, { Unit } from '@kbn/datemath';

import { i18n } from '@kbn/i18n';
import { parseEsInterval } from '../../../utils';

const unitsDesc = dateMath.unitsDesc;
const largeMax = unitsDesc.indexOf('w');

export interface EsInterval {
  expression: string;
  unit: Unit;
  value: number;
}

/**
 * Convert a moment.duration into an es
 * compatible expression, and provide
 * associated metadata
 *
 * @param  {moment.duration} duration
 * @return {object}
 */
export function convertDurationToNormalizedEsInterval(
  duration: moment.Duration,
  targetUnit?: Unit
): EsInterval {
  for (let i = 0; i < unitsDesc.length; i++) {
    const unit = unitsDesc[i];
    const val = duration.as(unit);
    // find a unit that rounds neatly
    if (val >= 1 && Math.floor(val) === val) {
      if (val === 1 && targetUnit && unit !== targetUnit) {
        continue;
      }
      // if the unit is "large", like years, but
      // isn't set to 1 ES will puke. So keep going until
      // we get out of the "large" units
      if (i <= largeMax && val !== 1) {
        continue;
      }

      return {
        value: val,
        unit,
        expression: val + unit,
      };
    }
  }

  const ms = duration.as('ms');
  return {
    value: ms,
    unit: 'ms',
    expression: ms + 'ms',
  };
}

export function convertIntervalToEsInterval(interval: string): EsInterval {
  const { value, unit } = parseEsInterval(interval);
  return {
    value,
    unit,
    expression: interval,
  };
}

declare module 'moment' {
  interface Locale {
    _config: moment.LocaleSpecification;
  }
}

// Below 5 seconds the "humanize" call returns the "few seconds" sentence, which is not ok for ms
// This special config rewrite makes it sure to have precision also for sub-seconds durations
// ref: https://github.com/moment/moment/issues/348
export function getPreciseDurationDescription(
  intervalValue: number,
  unit: moment.unitOfTime.Base
): string {
  // moment cannot format anything below seconds, so this requires a manual handling
  if (unit === 'millisecond') {
    return intervalValue === 1
      ? i18n.translate('data.search.aggs.buckets.intervalOptions.millisecond', {
          defaultMessage: 'millisecond',
        })
      : i18n.translate('data.search.aggs.buckets.intervalOptions.milliseconds', {
          defaultMessage: '{n} milliseconds',
          values: { n: intervalValue },
        });
  }
  // Save default values
  const roundingDefault = moment.relativeTimeRounding();
  const units = [
    { unit: 'm', value: 60 }, // This should prevent to round up 45 minutes to "an hour"
    { unit: 's', value: 60 }, // this should prevent to round up 45 seconds to "a minute"
    { unit: 'ss', value: 0 }, // This should prevent to round anything below 5 seconds to "few seconds"
    { unit: 'ms', value: 1000 }, // this should render precision at milliseconds level
  ];
  const defaultValues = units.map(({ unit: u }) => moment.relativeTimeThreshold(u) as number);

  const DIGITS = 2;
  const powValue = Math.pow(10, DIGITS);
  moment.relativeTimeRounding((t) => {
    return Math.round(t * powValue) / powValue;
  });
  units.forEach(({ unit: u, value }) => moment.relativeTimeThreshold(u, value));

  const defaultLocaleConfig = moment.localeData()._config;
  moment.updateLocale(moment.locale(), {
    relativeTime: {
      ss: (n: number): string => {
        return n === 1
          ? i18n.translate('data.search.aggs.buckets.intervalOptions.second', {
              defaultMessage: 'second',
            })
          : i18n.translate('data.search.aggs.buckets.intervalOptions.seconds', {
              defaultMessage: '{n} seconds',
              values: { n },
            });
      },
      m: i18n.translate('data.search.aggs.buckets.intervalOptions.minute', {
        defaultMessage: 'minute',
      }),
      h: i18n.translate('data.search.aggs.buckets.intervalOptions.hourly', {
        defaultMessage: 'hour',
      }),
      d: i18n.translate('data.search.aggs.buckets.intervalOptions.daily', {
        defaultMessage: 'day',
      }),
      w: i18n.translate('data.search.aggs.buckets.intervalOptions.weekly', {
        defaultMessage: 'week',
      }),
      M: i18n.translate('data.search.aggs.buckets.intervalOptions.monthly', {
        defaultMessage: 'month',
      }),
      y: i18n.translate('data.search.aggs.buckets.intervalOptions.yearly', {
        defaultMessage: 'year',
      }),
    },
  });

  // Execute the format/humanize call in the callback
  const result = moment.duration(intervalValue, unit).locale(i18n.getLocale()).humanize();

  // restore all the default values now in moment to not break it
  units.forEach(({ unit: u }, i) => moment.relativeTimeThreshold(unit, defaultValues[i]));
  moment.relativeTimeRounding(roundingDefault);

  // restore all the default values now in moment to not break it
  moment.updateLocale(moment.locale(), defaultLocaleConfig);
  return result;
}
