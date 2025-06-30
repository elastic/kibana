/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLSingleAstItem } from '../../../types';
import { pipeCompleteItem } from '../../utils/autocomplete/complete_items';
import { suggestForExpression } from '../../utils/autocomplete';
import { isExpressionComplete, getExpressionType } from '../../utils/validate';
import {
  type ISuggestionItem,
  type GetColumnsByTypeFn,
  type ICommandContext,
  Location,
  ESQLFieldWithMetadata,
} from '../../types';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  getColumnsByType: GetColumnsByTypeFn,
  getSuggestedUserDefinedColumnName: (extraFieldNames?: string[] | undefined) => string,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  const expressionRoot = command.args[0] as ESQLSingleAstItem | undefined;
  const suggestions = await suggestForExpression({
    innerText: query,
    getColumnsByType,
    expressionRoot,
    location: Location.WHERE,
    preferredExpressionType: 'boolean',
  });

  // Is this a complete boolean expression?
  // If so, we can call it done and suggest a pipe
  const expressionType = getExpressionType(expressionRoot);
  if (expressionType === 'boolean' && isExpressionComplete(expressionType, query)) {
    suggestions.push(pipeCompleteItem);
  }

  return suggestions;
}
