/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isAssignment } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLAstExpression, ESQLColumn } from '@elastic/esql/types';
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import { ESQL_STRING_TYPES } from '../../definitions/types';
import {
  pipeCompleteItem,
  assignCompletionItem,
  getNewUserDefinedColumnSuggestion,
} from '../complete_items';
import type { ISuggestionItem, ICommandContext, ICommandCallbacks } from '../types';

interface ESQLAstRegisteredDomainCommandLike extends ESQLAstAllCommands {
  targetField?: ESQLColumn;
  expression?: ESQLAstExpression;
}

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  _?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const { targetField, expression } = command as ESQLAstRegisteredDomainCommandLike;

  const hasAssignment = command.args.some((arg) => !Array.isArray(arg) && isAssignment(arg));
  const hasTargetFieldName = !!targetField?.name?.trim().length;

  if (hasAssignment && expression && !expression.incomplete && !/=\s*$/.test(innerText)) {
    return [withAutoSuggest(pipeCompleteItem)];
  }

  if (hasAssignment && /=\s*$/.test(innerText)) {
    const fieldSuggestions = (await callbacks?.getByType?.(ESQL_STRING_TYPES)) ?? [];

    return fieldSuggestions.map((suggestion) =>
      withAutoSuggest({
        ...suggestion,
        text: `${suggestion.text} `,
      })
    );
  }

  if (hasTargetFieldName && /\s$/.test(innerText)) {
    return [assignCompletionItem];
  }

  return [
    getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || ''),
  ];
}
