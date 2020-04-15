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

export const isDuration = format => {
  const splittedFormat = format.split(',');
  const [input, output] = splittedFormat;

  return Boolean(inputFormats[input] && outputFormats[output]) && splittedFormat.length === 3;
};
