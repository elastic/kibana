/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import type { ESQLCommand, ESQLSingleAstItem } from '../../../types';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../../types';
import { Location } from '../../types';
import { getPosition, CaretPosition } from './utils';
import { getNewUserDefinedColumnSuggestion, onCompleteItem } from '../../complete_items';
import {
  handleFragment,
  columnExists,
  suggestForExpression,
  withinQuotes,
  createInferenceEndpointToCompletionItem,
} from '../../../definitions/utils/autocomplete/helpers';
import { getCommandMapExpressionSuggestions } from '../../../definitions/utils/autocomplete/map_expression';
import { getInsideFunctionsSuggestions } from '../../../definitions/utils/autocomplete/functions';
import {
  pipeCompleteItem,
  commaCompleteItem,
  withCompleteItem,
  assignCompletionItem,
} from '../../complete_items';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { getExpressionType, isExpressionComplete } from '../../../definitions/utils/expressions';
import { logicalOperators } from '../../../definitions/all_operators';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);

  if (!callbacks?.getByType || withinQuotes(innerText)) {
    return [];
  }

  const { position, context: positionContext } = getPosition(innerText, command);

  const insideFunctionSuggestions = await getInsideFunctionsSuggestions(
    innerText,
    cursorPosition,
    callbacks,
    context
  );

  if (insideFunctionSuggestions?.length) {
    return insideFunctionSuggestions;
  }

  switch (position) {
    case CaretPosition.RERANK_KEYWORD: {
      const targetFieldName = callbacks?.getSuggestedUserDefinedColumnName?.() || '';
      const targetField = getNewUserDefinedColumnSuggestion(targetFieldName);
      return [targetField, ...createBasicConstants()];
    }

    case CaretPosition.RERANK_AFTER_TARGET_FIELD: {
      return [assignCompletionItem];
    }

    case CaretPosition.RERANK_AFTER_TARGET_ASSIGNMENT: {
      return createBasicConstants();
    }

    case CaretPosition.ON_KEYWORD: {
      return [onCompleteItem];
    }

    case CaretPosition.ON_WITHIN_FIELD_LIST: {
      return getContextualSuggestions({
        innerText,
        callbacks,
        context,
        suggestionType: 'field_list',
      });
    }

    case CaretPosition.ON_AFTER_FIELD_COMPLETE: {
      return buildNextActions({ includeAssign: true });
    }

    case CaretPosition.WITHIN_BOOLEAN_EXPRESSION: {
      return getContextualSuggestions({
        innerText,
        callbacks,
        context,
        suggestionType: 'boolean_expression',
        expressionRoot: positionContext?.expressionRoot,
      });
    }

    case CaretPosition.WITHIN_MAP_EXPRESSION: {
      const endpoints = context?.inferenceEndpoints;
      return handleMapExpression(innerText, endpoints);
    }

    case CaretPosition.AFTER_COMMAND: {
      return [pipeCompleteItem];
    }

    default: {
      return [];
    }
  }
}

// ============================================================================
// Suggestion Handlers
// ============================================================================

async function getContextualSuggestions({
  innerText,
  callbacks,
  context,
  suggestionType,
  expressionRoot,
}: {
  innerText: string;
  callbacks?: ICommandCallbacks;
  context?: ICommandContext;
  suggestionType: 'field_list' | 'boolean_expression';
  expressionRoot?: ESQLSingleAstItem;
}): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }

  switch (suggestionType) {
    case 'field_list': {
      const fieldSuggestions =
        (await callbacks.getByType(['keyword', 'text', 'boolean', 'integer', 'double', 'long'])) ??
        [];

      return handleFragment(
        innerText,
        // check if fragment is completed
        (fragment) => !!columnExists(fragment, context),
        // incomplete: get available fields suggestions
        (_: string, rangeToReplace?: { start: number; end: number }) => {
          return fieldSuggestions.map((suggestion) => ({
            ...suggestion,
            text: `${suggestion.text}`,
            rangeToReplace,
            command: TRIGGER_SUGGESTION_COMMAND,
          }));
        },
        // complete: get next actions suggestions for completed field
        (fragment: string, rangeToReplace: { start: number; end: number }) => {
          const suggestions = buildNextActions({ includeAssign: true, withSpaces: true });

          return suggestions.map((suggestion) => ({
            ...suggestion,
            filterText: fragment,
            text: fragment + suggestion.text,
            rangeToReplace,
            command: TRIGGER_SUGGESTION_COMMAND,
          }));
        }
      );
    }

    case 'boolean_expression': {
      if (expressionRoot) {
        const expressionType = getExpressionType(
          expressionRoot,
          context?.fields,
          context?.userDefinedColumns
        );

        if (expressionType === 'boolean' && isExpressionComplete(expressionType, innerText)) {
          return buildNextActions({ includeBinaryOperators: true });
        }
      }

      return await suggestForExpression({
        innerText,
        getColumnsByType: callbacks.getByType,
        expressionRoot,
        location: Location.RERANK,
        preferredExpressionType: 'boolean',
        context,
        hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
        activeProduct: context?.activeProduct,
      });
    }

    default:
      return [];
  }
}

/**
 * Handles suggestions within WITH map expressions
 */
function handleMapExpression(
  innerText: string,
  endpoints?: InferenceEndpointAutocompleteItem[]
): ISuggestionItem[] {
  const availableParameters = {
    inference_id: endpoints?.map(createInferenceEndpointToCompletionItem) || [],
  };

  return getCommandMapExpressionSuggestions(innerText, availableParameters);
}

// ============================================================================
// Suggestion Builders and Formatters
// ============================================================================

function createBasicConstants(): ISuggestionItem[] {
  return [
    {
      label: 'Your search query',
      text: '"${0:Your search query.}"',
      asSnippet: true,
      kind: 'Constant',
      sortText: '1',
      detail: '',
    },
  ];
}

function buildNextActions(options?: {
  includeAssign?: boolean;
  withSpaces?: boolean;
  includeBinaryOperators?: boolean;
}): ISuggestionItem[] {
  const {
    includeAssign = false,
    withSpaces = false,
    includeBinaryOperators = false,
  } = options || {};

  const items: ISuggestionItem[] = [];

  items.push({
    ...commaCompleteItem,
    text: commaCompleteItem.text + ' ',
    sortText: '01',
    command: TRIGGER_SUGGESTION_COMMAND,
  });

  items.push({
    ...withCompleteItem,
    text: withSpaces ? ' ' + withCompleteItem.text + ' ' : withCompleteItem.text,
    sortText: '03',
  });

  items.push({
    ...pipeCompleteItem,
    text: withSpaces ? ' ' + pipeCompleteItem.text : pipeCompleteItem.text,
    sortText: '04',
  });

  // Add assignment operator to the next actions, after a field name (ON clause)
  if (includeAssign) {
    items.push({ ...assignCompletionItem, text: ' = ', sortText: '02' });
  }

  // Add AND/OR operators to the next actions, after a boolean expression is completed
  if (includeBinaryOperators) {
    const andOperator = logicalOperators.find((op) => op.name === 'and')!;
    const orOperator = logicalOperators.find((op) => op.name === 'or')!;

    items.push(
      {
        // AND operator suggestion
        label: andOperator.name.toUpperCase(),
        text: ` ${andOperator.name.toUpperCase()} `,
        kind: 'Keyword',
        detail: andOperator.description,
        command: TRIGGER_SUGGESTION_COMMAND,
        sortText: '05',
      },
      {
        label: orOperator.name.toUpperCase(),
        text: ` ${orOperator.name.toUpperCase()} `,
        kind: 'Keyword',
        detail: orOperator.description,
        command: TRIGGER_SUGGESTION_COMMAND,
        sortText: '06',
      }
    );
  }

  return items;
}
