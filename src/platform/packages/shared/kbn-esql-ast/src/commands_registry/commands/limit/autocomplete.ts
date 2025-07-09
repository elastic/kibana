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
import { pipeCompleteItem } from '../../utils/complete_items';
import { buildConstantsDefinitions } from '../../../definitions/utils/literals';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  if (/[0-9]\s+$/.test(query)) {
    return [pipeCompleteItem];
  }

  return buildConstantsDefinitions(['10', '100', '1000'], '', undefined, {
    advanceCursorAndOpenSuggestions: true,
  });
}
