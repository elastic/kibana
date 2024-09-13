/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const durationBaseOptions = [
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.millisecondsLabel', {
      defaultMessage: 'Milliseconds',
    }),
    value: 'ms',
  },
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.secondsLabel', {
      defaultMessage: 'Seconds',
    }),
    value: 's',
  },
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.minutesLabel', {
      defaultMessage: 'Minutes',
    }),
    value: 'm',
  },
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.hoursLabel', {
      defaultMessage: 'Hours',
    }),
    value: 'h',
  },
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.daysLabel', {
      defaultMessage: 'Days',
    }),
    value: 'd',
  },
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.weeksLabel', {
      defaultMessage: 'Weeks',
    }),
    value: 'w',
  },
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.monthsLabel', {
      defaultMessage: 'Months',
    }),
    value: 'M',
  },
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.yearsLabel', {
      defaultMessage: 'Years',
    }),
    value: 'Y',
  },
];

export const durationOutputOptions = [
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.humanize', {
      defaultMessage: 'Human readable',
    }),
    value: 'humanize',
  },
  ...durationBaseOptions,
];

export const durationInputOptions = [
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.picosecondsLabel', {
      defaultMessage: 'Picoseconds',
    }),
    value: 'ps',
  },
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.nanosecondsLabel', {
      defaultMessage: 'Nanoseconds',
    }),
    value: 'ns',
  },
  {
    label: i18n.translate('visTypeTimeseries.durationOptions.microsecondsLabel', {
      defaultMessage: 'Microseconds',
    }),
    value: 'us',
  },
  ...durationBaseOptions,
];

export const inputFormats = {
  ps: 'picoseconds',
  ns: 'nanoseconds',
  us: 'microseconds',
  ms: 'milliseconds',
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
  w: 'weeks',
  M: 'months',
  Y: 'years',
};
export type InputFormat = keyof typeof inputFormats;

export const outputFormats = {
  humanize: 'humanize',
  ms: 'asMilliseconds',
  s: 'asSeconds',
  m: 'asMinutes',
  h: 'asHours',
  d: 'asDays',
  w: 'asWeeks',
  M: 'asMonths',
  Y: 'asYears',
};
export type OutputFormat = keyof typeof outputFormats;

export const getDurationParams = (
  format: string
): { from: InputFormat; to: OutputFormat; decimals: string } => {
  const [from, to, decimals] = format.split(',');

  return {
    from: from as InputFormat,
    to: to as OutputFormat,
    decimals,
  };
};

export const isDuration = (format: string) => {
  const splittedFormat = format.split(',');
  const [input, output] = splittedFormat;

  return (
    Boolean(inputFormats[input as InputFormat] && outputFormats[output as OutputFormat]) &&
    splittedFormat.length === 3
  );
};
