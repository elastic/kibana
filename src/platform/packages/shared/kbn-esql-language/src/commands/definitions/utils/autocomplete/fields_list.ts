/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isFunctionExpression, within, isAssignment, isColumn } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLAstField } from '@elastic/esql/types';
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
import { TRAILING_COMMA_REGEX } from '../shared';
import type { ExpressionContextOptions } from './expressions/types';

const ENDS_WITH_WHITESPACE_REGEX = /\s$/;

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
    /** Include pipe/comma suggestions after a complete field expression */
    includePipeAndCommaSuggestions?: boolean;
    /** If true, consideres a single column as a completed field expression */
    allowSingleColumnFields?: boolean;
    /** the preferred field type */
    preferredExpressionType?: ExpressionContextOptions['preferredExpressionType'];
    /** Columns to exclude from suggestions (e.g. already used in BY clause) */
    ignoredColumnsForEmptyExpression?: string[];
    /** If true, disables col0 and assignment suggestions (for contexts where assignments are not supported) */
    disableNewColumnSuggestion?: boolean;
  }
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }
  const innerText = query.substring(0, cursorPosition);
  const lastField = fieldList[fieldList.length - 1];

  const endsWithComma = TRAILING_COMMA_REGEX.test(innerText);
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
      ignoredColumnsForEmptyExpression: options?.ignoredColumnsForEmptyExpression,
    },
  });

  const { position, isComplete, insideFunction } = computed;

  if (
    position === 'empty_expression' &&
    !insideAssignment &&
    !options?.disableNewColumnSuggestion
  ) {
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
    if (options?.includePipeAndCommaSuggestions !== false) {
      const commaSuggestion = withAutoSuggest({ ...commaCompleteItem, text: ', ' });

      if (ENDS_WITH_WHITESPACE_REGEX.test(innerText)) {
        commaSuggestion.rangeToReplace = {
          start: innerText.length - 1,
          end: innerText.length,
        };
      }

      suggestions.push(pipeCompleteItem, commaSuggestion);
    }

    if (options?.afterCompleteSuggestions) {
      suggestions.push(...options.afterCompleteSuggestions);
    }
  }

  // After a new column definition col0 ^
  if (
    isColumn(expressionRoot) &&
    !insideAssignment &&
    !options?.disableNewColumnSuggestion &&
    !context?.columns?.has(expressionRoot.name)
  ) {
    suggestions.push(assignCompletionItem);
  }

  return suggestions;
}
