/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findFinalWord } from '../../../shared/helpers';
import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import { pipeCompleteItem } from '../../complete_items';

export async function suggest({
  innerText,
  getColumnsByType,
}: CommandSuggestParams<'limit'>): Promise<SuggestionRawDefinition[]> {
  if (/MV_EXPAND\s+\S+\s+$/i.test(innerText)) {
    return [pipeCompleteItem];
  }

  const columnSuggestions = await getColumnsByType('any', undefined, {
    advanceCursor: true,
    openSuggestions: true,
  });

  const fragment = findFinalWord(innerText);
  columnSuggestions.forEach((suggestion) => {
    suggestion.rangeToReplace = {
      start: innerText.length - fragment.length + 1,
      end: innerText.length,
    };
  });

  return columnSuggestions;
}
