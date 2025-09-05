/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '../../../types';
import { pipeCompleteItem } from '../../complete_items';
import type { ICommandCallbacks } from '../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }

  const suggestions: ISuggestionItem[] = [];

  // TODO: Add more specific autocomplete logic for RERANK command
  const fieldSuggestions = await callbacks.getByType('any');
  suggestions.push(...fieldSuggestions);

  // Add the pipe completion item when appropriate
  suggestions.push(pipeCompleteItem);

  return suggestions;
}
