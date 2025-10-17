/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstAllCommands } from '../../../types';
import { getSettingsCompletionItems } from '../../../definitions/utils/settings';
import { isBinaryExpression, semiColonCompleteItem } from '../../../..';
import type { ICommandCallbacks } from '../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';

// SET <setting> = <value>;
export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const settingArg = command.args[0];

  // SET /
  if (!settingArg) {
    return getSettingsCompletionItems();
  }

  // SET <setting> = <value>/
  if (isBinaryExpression(settingArg) && !settingArg.incomplete) {
    return [
      {
        ...semiColonCompleteItem,
        text: ';\n', // Add a new line so the actual query starts in the line below.
      },
    ];
  }

  return [];
}
