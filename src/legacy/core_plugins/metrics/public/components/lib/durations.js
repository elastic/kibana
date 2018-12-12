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

export const durationOutputOptions = [
  {
    label: i18n.translate('tsvb.durationOptions.millisecondsLabel', { defaultMessage: 'milliseconds' }),
    value: 'ms'
  },
  {
    label: i18n.translate('tsvb.durationOptions.secondsLabel', { defaultMessage: 'seconds' }),
    value: 's'
  },
  {
    label: i18n.translate('tsvb.durationOptions.minutesLabel', { defaultMessage: 'minutes' }),
    value: 'm'
  },
  {
    label: i18n.translate('tsvb.durationOptions.hoursLabel', { defaultMessage: 'hours' }),
    value: 'h'
  },
  {
    label: i18n.translate('tsvb.durationOptions.daysLabel', { defaultMessage: 'days' }),
    value: 'd'
  },
  {
    label: i18n.translate('tsvb.durationOptions.weeksLabel', { defaultMessage: 'weeks' }),
    value: 'w'
  },
  {
    label: i18n.translate('tsvb.durationOptions.monthsLabel', { defaultMessage: 'months' }),
    value: 'M'
  },
  {
    label: i18n.translate('tsvb.durationOptions.yearsLabel', { defaultMessage: 'years' }),
    value: 'Y'
  }
];

export const durationInputOptions = [
  {
    label: i18n.translate('tsvb.durationOptions.picosecondsLabel', { defaultMessage: 'picoseconds' }),
    value: 'ps'
  },
  {
    label: i18n.translate('tsvb.durationOptions.nanosecondsLabel', { defaultMessage: 'nanoseconds' }),
    value: 'ns'
  },
  {
    label: i18n.translate('tsvb.durationOptions.microsecondsLabel', { defaultMessage: 'microseconds' }),
    value: 'us' },
  ...durationOutputOptions
];

