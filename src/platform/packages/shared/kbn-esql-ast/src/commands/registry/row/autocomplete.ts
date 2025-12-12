/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getFunctionsSuggestions } from '../../definitions/utils';
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import type { ESQLAstAllCommands } from '../../../types';
import type { ICommandCallbacks } from '../types';
import { type ISuggestionItem, type ICommandContext } from '../types';
import {
  pipeCompleteItem,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
} from '../complete_items';
import { Location } from '../types';
import { isRestartingExpression } from '../../definitions/utils/shared';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  // ROW col0 = /
  if (/=\s*$/.test(innerText)) {
    return getFunctionsSuggestions({
      location: Location.ROW,
      types: ['any'],
      options: { ignored: [] },
      context,
      callbacks,
    });
  }

  // ROW col0 = 23 /
  else if (command.args.length > 0 && !isRestartingExpression(innerText)) {
    return [
      withAutoSuggest(pipeCompleteItem),
      withAutoSuggest({ ...commaCompleteItem, text: ', ' }),
    ];
  }

  // ROW /
  // ROW foo = "bar", /
  return [
    getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || ''),
    ...getFunctionsSuggestions({
      location: Location.ROW,
      types: ['any'],
      options: { ignored: [] },
      context,
      callbacks,
    }),
  ];
}
