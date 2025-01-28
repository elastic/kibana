/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Literals } from './types';

export const timeUnitsToSuggest: Literals[] = [
  {
    name: 'year',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.year',
      {
        defaultMessage: 'Year',
      }
    ),
  },
  {
    name: 'years',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.years',
      {
        defaultMessage: 'Years (Plural)',
      }
    ),
  },
  {
    name: 'quarter',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.quarter',
      {
        defaultMessage: 'Quarter',
      }
    ),
  },
  {
    name: 'quarters',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.quarters',
      {
        defaultMessage: 'Quarters (Plural)',
      }
    ),
  },
  {
    name: 'month',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.month',
      {
        defaultMessage: 'Month',
      }
    ),
  },
  {
    name: 'months',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.months',
      {
        defaultMessage: 'Months (Plural)',
      }
    ),
  },
  {
    name: 'week',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.week',
      {
        defaultMessage: 'Week',
      }
    ),
  },
  {
    name: 'weeks',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.weeks',
      {
        defaultMessage: 'Weeks (Plural)',
      }
    ),
  },
  {
    name: 'day',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.day',
      {
        defaultMessage: 'Day',
      }
    ),
  },
  {
    name: 'days',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.days',
      {
        defaultMessage: 'Days (Plural)',
      }
    ),
  },
  {
    name: 'hour',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.hour',
      {
        defaultMessage: 'Hour',
      }
    ),
  },
  {
    name: 'hours',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.hours',
      {
        defaultMessage: 'Hours (Plural)',
      }
    ),
  },
  {
    name: 'minute',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.minute',
      {
        defaultMessage: 'Minute',
      }
    ),
  },
  {
    name: 'minutes',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.minutes',
      {
        defaultMessage: 'Minutes (Plural)',
      }
    ),
  },
  {
    name: 'second',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.second',
      {
        defaultMessage: 'Second',
      }
    ),
  },
  {
    name: 'seconds',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.seconds',
      {
        defaultMessage: 'Seconds (Plural)',
      }
    ),
  },
  {
    name: 'millisecond',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.millisecond',
      {
        defaultMessage: 'Millisecond',
      }
    ),
  },
  {
    name: 'milliseconds',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.dateDurationDefinition.milliseconds',
      {
        defaultMessage: 'Milliseconds (Plural)',
      }
    ),
  },
];

export const timeUnits: string[] = [
  ...timeUnitsToSuggest.map((literal) => literal.name),
  'ms',
  's',
  'm',
  'h',
  'd',
  'w',
  'mo',
  'q',
  'y',
  'yr',
];

export const chronoLiterals: Literals[] = [
  'ALIGNED_DAY_OF_WEEK_IN_MONTH',
  'ALIGNED_DAY_OF_WEEK_IN_YEAR',
  'ALIGNED_WEEK_OF_MONTH',
  'ALIGNED_WEEK_OF_YEAR',
  'AMPM_OF_DAY',
  'CLOCK_HOUR_OF_AMPM',
  'CLOCK_HOUR_OF_DAY',
  'DAY_OF_MONTH',
  'DAY_OF_WEEK',
  'DAY_OF_YEAR',
  'EPOCH_DAY',
  'ERA',
  'HOUR_OF_AMPM',
  'HOUR_OF_DAY',
  'INSTANT_SECONDS',
  'MICRO_OF_DAY',
  'MICRO_OF_SECOND',
  'MILLI_OF_DAY',
  'MILLI_OF_SECOND',
  'MINUTE_OF_DAY',
  'MINUTE_OF_HOUR',
  'MONTH_OF_YEAR',
  'NANO_OF_DAY',
  'NANO_OF_SECOND',
  'OFFSET_SECONDS',
  'PROLEPTIC_MONTH',
  'SECOND_OF_DAY',
  'SECOND_OF_MINUTE',
  'YEAR',
  'YEAR_OF_ERA',
].map((name) => ({ name: `"${name}"`, description: '' }));
