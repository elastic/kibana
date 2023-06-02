/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { AutocompleteCommandDefinition } from '../types';

export const comparisonOperatorsCommandsDefinitions: AutocompleteCommandDefinition[] = [
  {
    label: 'or',
    insertText: 'or',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.orDoc', {
      defaultMessage: 'or',
    }),
    sortText: 'D',
  },
  {
    label: 'and',
    insertText: 'and',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.andDoc', {
      defaultMessage: 'and',
    }),
    sortText: 'D',
  },
];

export const comparisonCommandsDefinitions: AutocompleteCommandDefinition[] = [
  {
    label: '==',
    insertText: '==',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.equalToDoc', {
      defaultMessage: 'Equal to',
    }),
    sortText: 'D',
  },
  {
    label: '!=',
    insertText: '!=',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.notEqualToDoc', {
      defaultMessage: 'Not equal to',
    }),
    sortText: 'D',
  },
  {
    label: '<',
    insertText: '<',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.lessThanDoc', {
      defaultMessage: 'Less than',
    }),
    sortText: 'D',
  },
  {
    label: '>',
    insertText: '>',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.greaterThanDoc', {
      defaultMessage: 'Greater than',
    }),
    sortText: 'D',
  },
  {
    label: '<=',
    insertText: '<=',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.lessThanOrEqualToDoc', {
      defaultMessage: 'Less than or equal to',
    }),
    sortText: 'D',
  },
  {
    label: '>=',
    insertText: '>=',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.greaterThanOrEqualToDoc', {
      defaultMessage: 'Greater than or equal to',
    }),
    sortText: 'D',
  },
];
