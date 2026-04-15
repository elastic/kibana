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

export const EDITOR_MARKER = 'marker_esql_editor';

// List for suggestions (human-friendly)
export const timeUnitsToSuggest: Literals[] = [
  {
    name: 'y',
    description: i18n.translate('kbn-esql-language.esql.definitions.dateDurationDefinition.year', {
      defaultMessage: 'Year (y)',
    }),
  },
  {
    name: 'q',
    description: i18n.translate(
      'kbn-esql-language.esql.definitions.dateDurationDefinition.quarter',
      {
        defaultMessage: 'Quarter (q)',
      }
    ),
  },
  {
    name: 'mo',
    description: i18n.translate('kbn-esql-language.esql.definitions.dateDurationDefinition.month', {
      defaultMessage: 'Month (mo)',
    }),
  },
  {
    name: 'w',
    description: i18n.translate('kbn-esql-language.esql.definitions.dateDurationDefinition.week', {
      defaultMessage: 'Week (w)',
    }),
  },
  {
    name: 'd',
    description: i18n.translate('kbn-esql-language.esql.definitions.dateDurationDefinition.day', {
      defaultMessage: 'Day (d)',
    }),
  },
  {
    name: 'h',
    description: i18n.translate('kbn-esql-language.esql.definitions.dateDurationDefinition.hour', {
      defaultMessage: 'Hour (h)',
    }),
  },
  {
    name: 'm',
    description: i18n.translate(
      'kbn-esql-language.esql.definitions.dateDurationDefinition.minute',
      {
        defaultMessage: 'Minute (m)',
      }
    ),
  },
  {
    name: 's',
    description: i18n.translate(
      'kbn-esql-language.esql.definitions.dateDurationDefinition.second',
      {
        defaultMessage: 'Second (s)',
      }
    ),
  },
  {
    name: 'ms',
    description: i18n.translate(
      'kbn-esql-language.esql.definitions.dateDurationDefinition.millisecond',
      {
        defaultMessage: 'Millisecond (ms)',
      }
    ),
  },
];

export const FULL_TEXT_SEARCH_FUNCTIONS = [
  'match',
  'match_operator',
  'match_phrase',
  'qstr',
  'kql',
];
