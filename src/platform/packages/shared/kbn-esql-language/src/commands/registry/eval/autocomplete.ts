/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isAssignment, isColumn, isFunctionExpression } from '../../../ast/is';
import { within } from '../../../ast/location';
import { suggestForExpression } from '../../definitions/utils';
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import { getAssignmentExpressionRoot } from '../../definitions/utils/expressions';
import { FULL_TEXT_SEARCH_FUNCTIONS } from '../../definitions/constants';
import type { ESQLAstAllCommands, ESQLSingleAstItem } from '../../../types';
import {
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
  pipeCompleteItem,
} from '../complete_items';
import type { ICommandCallbacks } from '../types';
import { Location, type ICommandContext, type ISuggestionItem } from '../types';

export const FUNCTIONS_TO_IGNORE = {
  names: [...FULL_TEXT_SEARCH_FUNCTIONS],
  allowedInsideFunctions: Object.fromEntries(
    FULL_TEXT_SEARCH_FUNCTIONS.map((fn) => [fn, ['score']])
  ) as Record<(typeof FULL_TEXT_SEARCH_FUNCTIONS)[number], string[]>,
};

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }
  const innerText = query.substring(0, cursorPosition);
  const lastArg = command.args[command.args.length - 1] as ESQLSingleAstItem | undefined;

  const endsWithComma = /,\s*$/.test(innerText);
  const withinFunction =
    lastArg && isFunctionExpression(lastArg) && within(innerText.length, lastArg);
  const startingNewExpression = endsWithComma && !withinFunction;

  let expressionRoot = startingNewExpression ? undefined : lastArg;
  let insideAssignment = false;

  if (expressionRoot && isAssignment(expressionRoot)) {
    expressionRoot = getAssignmentExpressionRoot(expressionRoot);
    insideAssignment = true;
  }

  const { suggestions, computed } = await suggestForExpression({
    query,
    expressionRoot,
    command,
    cursorPosition,
    location: Location.EVAL,
    context,
    callbacks,
    options: {
      preferredExpressionType: 'any',
      functionsToIgnore: FUNCTIONS_TO_IGNORE,
    },
  });

  const { position, isComplete, insideFunction } = computed;

  if (position === 'empty_expression' && !insideAssignment) {
    suggestions.push(
      getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
    );
  }

  if (
    isComplete &&
    expressionRoot &&
    (!isColumn(expressionRoot) || insideAssignment) &&
    !insideFunction
  ) {
    suggestions.push(
      withAutoSuggest(pipeCompleteItem),
      withAutoSuggest({ ...commaCompleteItem, text: ', ' })
    );
  }

  return suggestions;
}
