/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { getNewUserDefinedColumnSuggestion, TRIGGER_SUGGESTION_COMMAND } from '../../factories';
import { CommandSuggestParams } from '../../../definitions/types';

import type { SuggestionRawDefinition } from '../../types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';

export async function suggest({
  getColumnsByType,
  innerText,
  getSuggestedUserDefinedColumnName,
  columnExists,
}: CommandSuggestParams<'rename'>): Promise<SuggestionRawDefinition[]> {
  if (/(?:rename|,)\s+\S+\s+a$/i.test(innerText)) {
    return [asCompletionItem];
  }

  // If the left side of the rename is a column that exists, we suggest the 'AS' completion item.
  // If it doesn't exist, we suggest the '=' completion item.
  const match = innerText.match(/(?:rename|,)\s+(\S+)\s+a?$/i);
  if (match) {
    const leftSideOfRename = match[1];
    return columnExists(leftSideOfRename) ? [asCompletionItem] : [assignCompletionItem];
  }

  if (/(?:rename|,)\s+\S+\s+a?$/i.test(innerText)) {
    return [asCompletionItem, assignCompletionItem];
  }

  if (/rename(?:\s+\S+\s+(as|=)\s+\S+\s*,)*\s+\S+\s+(as|=)\s+[^\s,]+\s+$/i.test(innerText)) {
    return [pipeCompleteItem, { ...commaCompleteItem, text: ', ' }];
  }

  if (/as\s+$/i.test(innerText)) {
    return [];
  }

  const suggestions = await getColumnsByType('any', [], {
    advanceCursor: true,
    openSuggestions: true,
  });

  if (!/=\s+$/i.test(innerText)) {
    suggestions.push(getNewUserDefinedColumnSuggestion(getSuggestedUserDefinedColumnName()));
  }

  return suggestions;
}

const asCompletionItem: SuggestionRawDefinition = {
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.asDoc', {
    defaultMessage: 'As',
  }),
  kind: 'Reference',
  label: 'AS',
  sortText: '1',
  text: 'AS ',
};

const assignCompletionItem: SuggestionRawDefinition = {
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.assignDoc', {
    defaultMessage: '=',
  }),
  kind: 'Reference',
  label: '=',
  sortText: '2',
  text: '= ',
  command: TRIGGER_SUGGESTION_COMMAND,
};
