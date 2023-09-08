/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { AutocompleteCommandDefinition } from '../types';

export const dateExpressionDefinitions: AutocompleteCommandDefinition[] = [
  {
    label: 'year',
    insertText: 'year',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.year', {
      defaultMessage: 'Year',
    }),
    sortText: 'D',
  },
  {
    label: 'years',
    insertText: 'years',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.years', {
      defaultMessage: 'Years (Plural)',
    }),
    sortText: 'D',
  },
  {
    label: 'month',
    insertText: 'month',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.month', {
      defaultMessage: 'Month',
    }),
    sortText: 'D',
  },
  {
    label: 'months',
    insertText: 'months',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.months', {
      defaultMessage: 'Months (Plural)',
    }),
    sortText: 'D',
  },
  {
    label: 'week',
    insertText: 'week',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.week', {
      defaultMessage: 'Week',
    }),
    sortText: 'D',
  },
  {
    label: 'weeks',
    insertText: 'weeks',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.weeks', {
      defaultMessage: 'Weeks (Plural)',
    }),
    sortText: 'D',
  },
  {
    label: 'day',
    insertText: 'day',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.day', {
      defaultMessage: 'Day',
    }),
    sortText: 'D',
  },
  {
    label: 'days',
    insertText: 'days',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.days', {
      defaultMessage: 'Days (Plural)',
    }),
    sortText: 'D',
  },
  {
    label: 'hour',
    insertText: 'hour',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.hour', {
      defaultMessage: 'Hour',
    }),
    sortText: 'D',
  },
  {
    label: 'hours',
    insertText: 'hours',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.hours', {
      defaultMessage: 'Hours (Plural)',
    }),
    sortText: 'D',
  },
  {
    label: 'minute',
    insertText: 'minute',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.minute', {
      defaultMessage: 'Minute',
    }),
    sortText: 'D',
  },
  {
    label: 'minutes',
    insertText: 'minutes',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.minutes', {
      defaultMessage: 'Minutes (Plural)',
    }),
    sortText: 'D',
  },
  {
    label: 'second',
    insertText: 'second',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.second', {
      defaultMessage: 'Second',
    }),
    sortText: 'D',
  },
  {
    label: 'seconds',
    insertText: 'seconds',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.seconds', {
      defaultMessage: 'Seconds (Plural)',
    }),
    sortText: 'D',
  },
  {
    label: 'millisecond',
    insertText: 'millisecond',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.millisecond', {
      defaultMessage: 'Millisecond',
    }),
    sortText: 'D',
  },
  {
    label: 'milliseconds',
    insertText: 'milliseconds',
    kind: 12,
    detail: i18n.translate('monaco.esql.autocomplete.dateDurationDefinition.milliseconds', {
      defaultMessage: 'Milliseconds (Plural)',
    }),
    sortText: 'D',
  },
];
