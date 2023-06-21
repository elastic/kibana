/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { AutocompleteCommandDefinition } from '../types';

export const byOperatorDefinition: AutocompleteCommandDefinition = {
  label: 'by',
  insertText: 'by ',
  kind: 21,
  detail: i18n.translate('monaco.esql.autocomplete.byDoc', {
    defaultMessage: 'By',
  }),
  sortText: 'D',
};

export const assignOperatorDefinition: AutocompleteCommandDefinition = {
  label: '=',
  insertText: '=',
  kind: 11,
  detail: i18n.translate('monaco.esql.autocomplete.assignDoc', {
    defaultMessage: 'Assign (=)',
  }),
  sortText: 'D',
};

export const openBracketDefinition: AutocompleteCommandDefinition = {
  label: '(',
  insertText: '(',
  kind: 11,
  detail: i18n.translate('monaco.esql.autocomplete.openBracketDoc', {
    defaultMessage: 'Open Bracket (',
  }),
  sortText: 'A',
};

export const closeBracketDefinition: AutocompleteCommandDefinition = {
  label: ')',
  insertText: ')',
  kind: 11,
  detail: i18n.translate('monaco.esql.autocomplete.closeBracketDoc', {
    defaultMessage: 'Close Bracket )',
  }),
  sortText: 'A',
};

export const mathOperatorsCommandsDefinitions: AutocompleteCommandDefinition[] = [
  {
    label: '+',
    insertText: '+',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.addDoc', {
      defaultMessage: 'Add (+)',
    }),
    sortText: 'D',
  },
  {
    label: '-',
    insertText: '-',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.subtractDoc', {
      defaultMessage: 'Subtract (-)',
    }),
    sortText: 'D',
  },
  {
    label: '/',
    insertText: '/',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.divideDoc', {
      defaultMessage: 'Divide (/)',
    }),
    sortText: 'D',
  },
  {
    label: '*',
    insertText: '*',
    kind: 11,
    detail: i18n.translate('monaco.esql.autocomplete.multiplyDoc', {
      defaultMessage: 'Multiply (*)',
    }),
    sortText: 'D',
  },
];
