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
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.year', {
      defaultMessage: 'Year',
    }),
  },
  {
    name: 'years',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.years', {
      defaultMessage: 'Years (Plural)',
    }),
  },
  {
    name: 'quarter',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.quarter', {
      defaultMessage: 'Quarter',
    }),
  },
  {
    name: 'quarters',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.quarters', {
      defaultMessage: 'Quarters (Plural)',
    }),
  },
  {
    name: 'month',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.month', {
      defaultMessage: 'Month',
    }),
  },
  {
    name: 'months',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.months', {
      defaultMessage: 'Months (Plural)',
    }),
  },
  {
    name: 'week',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.week', {
      defaultMessage: 'Week',
    }),
  },
  {
    name: 'weeks',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.weeks', {
      defaultMessage: 'Weeks (Plural)',
    }),
  },
  {
    name: 'day',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.day', {
      defaultMessage: 'Day',
    }),
  },
  {
    name: 'days',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.days', {
      defaultMessage: 'Days (Plural)',
    }),
  },
  {
    name: 'hour',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.hour', {
      defaultMessage: 'Hour',
    }),
  },
  {
    name: 'hours',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.hours', {
      defaultMessage: 'Hours (Plural)',
    }),
  },
  {
    name: 'minute',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.minute', {
      defaultMessage: 'Minute',
    }),
  },
  {
    name: 'minutes',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.minutes', {
      defaultMessage: 'Minutes (Plural)',
    }),
  },
  {
    name: 'second',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.second', {
      defaultMessage: 'Second',
    }),
  },
  {
    name: 'seconds',
    description: i18n.translate('kbn-esql-ast.esql.definitions.dateDurationDefinition.seconds', {
      defaultMessage: 'Seconds (Plural)',
    }),
  },
  {
    name: 'millisecond',
    description: i18n.translate(
      'kbn-esql-ast.esql.definitions.dateDurationDefinition.millisecond',
      {
        defaultMessage: 'Millisecond',
      }
    ),
  },
  {
    name: 'milliseconds',
    description: i18n.translate(
      'kbn-esql-ast.esql.definitions.dateDurationDefinition.milliseconds',
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

export const FULL_TEXT_SEARCH_FUNCTIONS = ['match', 'match_operator', 'qstr', 'kql'];
export const UNSUPPORTED_COMMANDS_BEFORE_QSTR = new Set([
  'show',
  'row',
  'dissect',
  'enrich',
  'eval',
  'grok',
  'keep',
  'mv_expand',
  'rename',
  'stats',
  'limit',
]);
export const UNSUPPORTED_COMMANDS_BEFORE_MATCH = new Set(['limit']);
