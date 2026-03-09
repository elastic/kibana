/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isAssignment } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLAstRegisteredDomainCommand } from '@elastic/esql/types';
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import { ESQL_STRING_TYPES } from '../../definitions/types';
import type { ISuggestionItem, ICommandContext, ICommandCallbacks } from '../types';
import {
  pipeCompleteItem,
  assignCompletionItem,
  getNewUserDefinedColumnSuggestion,
} from '../complete_items';

const ASSIGNMENT_AT_END_REGEX = /=\s*$/;
const TRAILING_SPACE_REGEX = /\s$/;

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const { targetField, expression } = command as ESQLAstRegisteredDomainCommand;

  const hasAssignment = command.args.some((arg) => !Array.isArray(arg) && isAssignment(arg));
  const hasTargetFieldName = !!targetField?.name?.trim().length;

  if (
    hasAssignment &&
    expression &&
    !expression.incomplete &&
    !ASSIGNMENT_AT_END_REGEX.test(innerText)
  ) {
    return [pipeCompleteItem];
  }

  if (hasAssignment && ASSIGNMENT_AT_END_REGEX.test(innerText)) {
    const fieldSuggestions = (await callbacks?.getByType?.(ESQL_STRING_TYPES)) ?? [];

    return fieldSuggestions.map((suggestion) =>
      withAutoSuggest({
        ...suggestion,
        text: `${suggestion.text} `,
      })
    );
  }

  if (hasTargetFieldName && TRAILING_SPACE_REGEX.test(innerText)) {
    return [assignCompletionItem];
  }

  return [
    getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || ''),
  ];
}
