/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import type { AutocompleteCommandDefinition } from '../types';

export const orderingCommandsDefinitions: AutocompleteCommandDefinition[] = [
  {
    label: 'asc',
    insertText: 'asc',
    kind: 17,
    detail: i18n.translate('monaco.esql.autocomplete.ascDoc', {
      defaultMessage: 'Ascending Order',
    }),
    sortText: 'D',
  },
  {
    label: 'desc',
    insertText: 'desc',
    kind: 17,
    detail: i18n.translate('monaco.esql.autocomplete.descDoc', {
      defaultMessage: 'Descending Order',
    }),
    sortText: 'D',
  },
];

export const nullsCommandsDefinition: AutocompleteCommandDefinition = {
  label: 'nulls',
  insertText: 'nulls',
  kind: 13,
  sortText: 'D',
};

export const nullsOrderingCommandsDefinitions: AutocompleteCommandDefinition[] = [
  {
    label: 'first',
    insertText: 'first',
    kind: 13,
    sortText: 'D',
  },
  {
    label: 'last',
    insertText: 'last',
    kind: 13,
    sortText: 'D',
  },
];
