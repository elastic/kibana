/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstAllCommands, ESQLAstField } from '@elastic/esql/types';
import { suggestFieldsList } from '../../definitions/utils/autocomplete/fields_list';
import type { ICommandCallbacks } from '../types';
import { type ISuggestionItem, type ICommandContext } from '../types';
import { Location } from '../types';
import { SuggestionCategory } from '../../../language/autocomplete/utils/sorting/types';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const cursorPos = cursorPosition ?? query.length;
  const rowCallbacks: ICommandCallbacks = { ...callbacks, getByType: async () => [] };
  const suggestions = await suggestFieldsList(
    query,
    command,
    command.args as ESQLAstField[],
    Location.ROW,
    rowCallbacks,
    context,
    cursorPos,
    {
      preferredExpressionType: 'any',
    }
  );

  // ROW fields are expressions in the grammar, but in practice users usually continue
  // a complete ROW expression with another column or command, not with expression operators.
  return suggestions.filter((suggestion) => {
    return suggestion.kind !== 'Operator' && suggestion.category !== SuggestionCategory.OPERATOR;
  });
}
