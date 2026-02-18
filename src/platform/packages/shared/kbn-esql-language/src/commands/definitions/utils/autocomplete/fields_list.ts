/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isFunctionExpression, within, isAssignment, isColumn } from '../../../../ast';
import type { ESQLAstAllCommands, ESQLAstField } from '../../../../types';
import {
  getNewUserDefinedColumnSuggestion,
  pipeCompleteItem,
  commaCompleteItem,
  assignCompletionItem,
} from '../../../registry/complete_items';
import type { Location } from '../../../registry/types';
import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../../../registry/types';
import { getAssignmentExpressionRoot } from '../expressions';
import { suggestForExpression } from './expressions';
import { withAutoSuggest } from './helpers';
import type { ExpressionContextOptions } from './expressions/types';

export async function suggestFieldsList(
  query: string,
  command: ESQLAstAllCommands,
  fieldList: ESQLAstField[],
  location: Location,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length,
  options?: {
    /** Listed functions will not be suggested in expressions */
    functionsToIgnore?: ExpressionContextOptions['functionsToIgnore'];
    /** Suggestions to show after a complete field expression */
    afterCompleteSuggestions?: ISuggestionItem[];
    /** If true, consideres a single column as a completed field expression */
    allowSingleColumnFields?: boolean;
    /** the preferred field type */
    preferredExpressionType?: ExpressionContextOptions['preferredExpressionType'];
  }
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }
  const innerText = query.substring(0, cursorPosition);
  const lastField = fieldList[fieldList.length - 1];

  const endsWithComma = /,\s*$/.test(innerText);
  const withinFunction =
    lastField && isFunctionExpression(lastField) && within(innerText.length, lastField);
  const startingNewExpression = endsWithComma && !withinFunction;

  let expressionRoot = startingNewExpression ? undefined : lastField;
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
    location,
    context,
    callbacks,
    options: {
      preferredExpressionType: options?.preferredExpressionType,
      functionsToIgnore: options?.functionsToIgnore,
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
    (!isColumn(expressionRoot) || insideAssignment || options?.allowSingleColumnFields) &&
    !insideFunction
  ) {
    suggestions.push(
      withAutoSuggest(pipeCompleteItem),
      withAutoSuggest({ ...commaCompleteItem, text: ', ' })
    );
    if (options?.afterCompleteSuggestions) {
      suggestions.push(...options.afterCompleteSuggestions);
    }
  }

  // After a new column definition col0 ^
  if (
    isColumn(expressionRoot) &&
    !insideAssignment &&
    !context?.columns?.has(expressionRoot.name)
  ) {
    suggestions.push(withAutoSuggest(assignCompletionItem));
  }

  return suggestions;
}
