/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand } from '../../../types';
import { type ISuggestionItem, type ICommandContext, ICommandCallbacks } from '../../types';
import { pipeCompleteItem } from '../../complete_items';
import { findFinalWord } from '../../../definitions/utils/autocomplete';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  if (/MV_EXPAND\s+\S+\s+$/i.test(innerText)) {
    return [pipeCompleteItem];
  }

  const columnSuggestions =
    (await callbacks?.getByType?.('any', undefined, {
      advanceCursor: true,
      openSuggestions: true,
    })) ?? [];

  const fragment = findFinalWord(innerText);
  columnSuggestions.forEach((suggestion) => {
    suggestion.rangeToReplace = {
      start: innerText.length - fragment.length + 1,
      end: innerText.length,
    };
  });

  return columnSuggestions;
}
