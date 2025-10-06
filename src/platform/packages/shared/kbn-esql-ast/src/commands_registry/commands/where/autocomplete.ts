/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isFunctionExpression } from '../../../ast/is';
import { within } from '../../../ast/location';
import type { ESQLCommand, ESQLSingleAstItem } from '../../../types';
import { pipeCompleteItem } from '../../complete_items';
import { suggestForExpression } from '../../../definitions/utils';
import { isExpressionComplete, getExpressionType } from '../../../definitions/utils/expressions';
import type { ICommandCallbacks } from '../../types';
import { type ISuggestionItem, type ICommandContext, Location } from '../../types';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }

  const innerText = query.substring(0, cursorPosition);
  const expressionRoot = command.args[0] as ESQLSingleAstItem | undefined;

  const suggestions = await suggestForExpression({
    query,
    expressionRoot,
    command,
    cursorPosition,
    location: Location.WHERE,
    context,
    callbacks,
    options: {
      preferredExpressionType: 'boolean',
    },
  });

  const insideFunction =
    expressionRoot &&
    isFunctionExpression(expressionRoot) &&
    within(cursorPosition, expressionRoot);

  const expressionType = getExpressionType(expressionRoot, context?.columns);

  if (
    // Complete boolean expression
    expressionType === 'boolean' &&
    isExpressionComplete(expressionType, innerText) &&
    // Don't suggest pipe if we're inside a function
    !insideFunction
  ) {
    suggestions.push(pipeCompleteItem);
  }

  return suggestions;
}
