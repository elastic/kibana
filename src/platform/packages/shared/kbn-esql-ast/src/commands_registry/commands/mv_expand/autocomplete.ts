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
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  if (/MV_EXPAND\s+\S+\s+$/i.test(query)) {
    return [pipeCompleteItem];
  }

  const columnSuggestions =
    (await callbacks?.getByType?.('any', undefined, {
      advanceCursor: true,
      openSuggestions: true,
    })) ?? [];

  const fragment = findFinalWord(query);
  columnSuggestions.forEach((suggestion) => {
    suggestion.rangeToReplace = {
      start: query.length - fragment.length + 1,
      end: query.length,
    };
  });

  return columnSuggestions;
}
