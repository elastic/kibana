/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { ISuggestionItem } from '../../types';

export const pipeCompleteItem: ISuggestionItem = {
  label: '|',
  text: '| ',
  kind: 'Keyword',
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.pipeDoc', {
    defaultMessage: 'Pipe (|)',
  }),
  sortText: 'C',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const getNewUserDefinedColumnSuggestion = (label: string): ISuggestionItem => {
  return {
    label,
    text: `${label} = `,
    kind: 'Variable',
    detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.newVarDoc', {
      defaultMessage: 'Define a new column',
    }),
    sortText: '1',
    command: TRIGGER_SUGGESTION_COMMAND,
  };
};

export const assignCompletionItem: ISuggestionItem = {
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.newVarDoc', {
    defaultMessage: 'Define a new column',
  }),
  command: TRIGGER_SUGGESTION_COMMAND,
  label: '=',
  kind: 'Variable',
  sortText: '1',
  text: '= ',
};
