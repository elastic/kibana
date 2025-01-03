/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const DEFAULT_INPUT_FORMAT = {
  text: i18n.translate('fieldFormats.duration.inputFormats.seconds', {
    defaultMessage: 'Seconds',
  }),
  kind: 'seconds',
};
const inputFormats = [
  {
    text: i18n.translate('fieldFormats.duration.inputFormats.picoseconds', {
      defaultMessage: 'Picoseconds',
    }),
    kind: 'picoseconds',
  },
  {
    text: i18n.translate('fieldFormats.duration.inputFormats.nanoseconds', {
      defaultMessage: 'Nanoseconds',
    }),
    kind: 'nanoseconds',
  },
  {
    text: i18n.translate('fieldFormats.duration.inputFormats.microseconds', {
      defaultMessage: 'Microseconds',
    }),
    kind: 'microseconds',
  },
  {
    text: i18n.translate('fieldFormats.duration.inputFormats.milliseconds', {
      defaultMessage: 'Milliseconds',
    }),
    kind: 'milliseconds',
  },
  { ...DEFAULT_INPUT_FORMAT },
  {
    text: i18n.translate('fieldFormats.duration.inputFormats.minutes', {
      defaultMessage: 'Minutes',
    }),
    kind: 'minutes',
  },
  {
    text: i18n.translate('fieldFormats.duration.inputFormats.hours', {
      defaultMessage: 'Hours',
    }),
    kind: 'hours',
  },
  {
    text: i18n.translate('fieldFormats.duration.inputFormats.days', {
      defaultMessage: 'Days',
    }),
    kind: 'days',
  },
  {
    text: i18n.translate('fieldFormats.duration.inputFormats.weeks', {
      defaultMessage: 'Weeks',
    }),
    kind: 'weeks',
  },
  {
    text: i18n.translate('fieldFormats.duration.inputFormats.months', {
      defaultMessage: 'Months',
    }),
    kind: 'months',
  },
  {
    text: i18n.translate('fieldFormats.duration.inputFormats.years', {
      defaultMessage: 'Years',
    }),
    kind: 'years',
  },
];
const DEFAULT_OUTPUT_FORMAT = {
  text: i18n.translate('fieldFormats.duration.outputFormats.humanize.approximate', {
    defaultMessage: 'Human-readable (approximate)',
  }),
  method: 'humanize',
};
const outputFormats = [
  { ...DEFAULT_OUTPUT_FORMAT },
  {
    text: i18n.translate('fieldFormats.duration.outputFormats.humanize.precise', {
      defaultMessage: 'Human-readable (precise)',
    }),
    method: 'humanizePrecise',
  },
  {
    text: i18n.translate('fieldFormats.duration.outputFormats.asMilliseconds', {
      defaultMessage: 'Milliseconds',
    }),
    shortText: i18n.translate('fieldFormats.duration.outputFormats.asMilliseconds.short', {
      defaultMessage: 'ms',
    }),
    method: 'asMilliseconds',
  },
  {
    text: i18n.translate('fieldFormats.duration.outputFormats.asSeconds', {
      defaultMessage: 'Seconds',
    }),
    shortText: i18n.translate('fieldFormats.duration.outputFormats.asSeconds.short', {
      defaultMessage: 's',
    }),
    method: 'asSeconds',
  },
  {
    text: i18n.translate('fieldFormats.duration.outputFormats.asMinutes', {
      defaultMessage: 'Minutes',
    }),
    shortText: i18n.translate('fieldFormats.duration.outputFormats.asMinutes.short', {
      defaultMessage: 'min',
    }),
    method: 'asMinutes',
  },
  {
    text: i18n.translate('fieldFormats.duration.outputFormats.asHours', {
      defaultMessage: 'Hours',
    }),
    shortText: i18n.translate('fieldFormats.duration.outputFormats.asHours.short', {
      defaultMessage: 'h',
    }),
    method: 'asHours',
  },
  {
    text: i18n.translate('fieldFormats.duration.outputFormats.asDays', {
      defaultMessage: 'Days',
    }),
    shortText: i18n.translate('fieldFormats.duration.outputFormats.asDays.short', {
      defaultMessage: 'd',
    }),
    method: 'asDays',
  },
  {
    text: i18n.translate('fieldFormats.duration.outputFormats.asWeeks', {
      defaultMessage: 'Weeks',
    }),
    shortText: i18n.translate('fieldFormats.duration.outputFormats.asWeeks.short', {
      defaultMessage: 'w',
    }),
    method: 'asWeeks',
  },
  {
    text: i18n.translate('fieldFormats.duration.outputFormats.asMonths', {
      defaultMessage: 'Months',
    }),
    shortText: i18n.translate('fieldFormats.duration.outputFormats.asMonths.short', {
      defaultMessage: 'mon',
    }),
    method: 'asMonths',
  },
  {
    text: i18n.translate('fieldFormats.duration.outputFormats.asYears', {
      defaultMessage: 'Years',
    }),
    shortText: i18n.translate('fieldFormats.duration.outputFormats.asYears.short', {
      defaultMessage: 'y',
    }),
    method: 'asYears',
  },
];

export const DEFAULT_DURATION_INPUT_FORMAT = DEFAULT_INPUT_FORMAT;
export const DEFAULT_DURATION_OUTPUT_FORMAT = DEFAULT_OUTPUT_FORMAT;
export const DURATION_INPUT_FORMATS = inputFormats;
export const DURATION_OUTPUT_FORMATS = outputFormats;
