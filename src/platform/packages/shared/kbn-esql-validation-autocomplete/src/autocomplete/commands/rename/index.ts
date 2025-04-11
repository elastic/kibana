/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { CommandSuggestParams } from '../../../definitions/types';

import type { SuggestionRawDefinition } from '../../types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';

export async function suggest({
  getColumnsByType,
  innerText,
}: CommandSuggestParams<'rename'>): Promise<SuggestionRawDefinition[]> {
  if (/(?:rename|,)\s+\S+\s+a?$/i.test(innerText)) {
    return [asCompletionItem];
  }

  if (/rename(?:\s+\S+\s+as\s+\S+\s*,)*\s+\S+\s+as\s+[^\s,]+\s+$/i.test(innerText)) {
    return [pipeCompleteItem, { ...commaCompleteItem, text: ', ' }];
  }

  if (/as\s+$/i.test(innerText)) {
    return [];
  }

  return getColumnsByType('any', [], { advanceCursor: true, openSuggestions: true });
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
