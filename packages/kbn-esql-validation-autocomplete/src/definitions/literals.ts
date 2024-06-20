/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Literals } from './types';

export const timeLiterals: Literals[] = [
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
