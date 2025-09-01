/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import type { ESQLCommand } from '../../../types';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../../types';
import { Location } from '../../types';
import { getPosition, CaretPosition } from './utils';
import { getNewUserDefinedColumnSuggestion, onCompleteItem } from '../../complete_items';
import {
  handleFragment,
  columnExists,
  getFieldsOrFunctionsSuggestions,
  suggestForExpression,
} from '../../../definitions/utils/autocomplete/helpers';
import { getCommandMapExpressionSuggestions } from '../../../definitions/utils/autocomplete/map_expression';
import { getInsideFunctionsSuggestions } from '../../../definitions/utils/autocomplete/functions';
import { isBooleanExpressionFinished } from '../../../definitions/utils/boolean_finishers';
import {
  pipeCompleteItem,
  commaCompleteItem,
  withCompleteItem,
  assignCompletionItem,
  andCompleteItem,
  orCompleteItem,
} from '../../complete_items';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }

  const innerText = query.substring(0, cursorPosition);
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

    case CaretPosition.SUGGEST_ON_KEYWORD: {
      return [onCompleteItem];
    }

    case CaretPosition.ON_AFTER_FIELD_LIST: {
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

    case CaretPosition.ON_AFTER_FIELD_ASSIGNMENT: {
      return getContextualSuggestions({
        innerText,
        callbacks,
        context,
        suggestionType: 'field_assignment',
      });
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
// Centralized Suggestion Handler (following STATS pattern)
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
  suggestionType: 'field_list' | 'field_assignment' | 'boolean_expression';
  expressionRoot?: any;
}): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }

  switch (suggestionType) {
    case 'field_list': {
      const fieldSuggestions =
        (await callbacks.getByType(['keyword', 'text', 'boolean', 'integer', 'double', 'long'])) ??
        [];

      // catch ON
      if (/\bon\s+[\s\S]*,\s*$/i.test(innerText)) {
        return formatSuggestions(fieldSuggestions);
      }

      // catch ON + space
      if (/\bon\s+$/i.test(innerText)) {
        return formatSuggestions(fieldSuggestions);
      }

      return handleFragment(
        innerText,
        (fragment) => !!columnExists(fragment, context),
        (_: string, rangeToReplace?: { start: number; end: number }) => {
          return fieldSuggestions.map((suggestion) => ({
            ...suggestion,
            text: `${suggestion.text}`,
            command: TRIGGER_SUGGESTION_COMMAND,
            rangeToReplace,
          }));
        },
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

    case 'field_assignment': {
      const suggestions = await getFieldsOrFunctionsSuggestions(
        ['any'],
        Location.WHERE,
        callbacks.getByType,
        {
          functions: true,
          fields: true,
          userDefinedColumns: context?.userDefinedColumns,
        },
        {},
        callbacks?.hasMinimumLicenseRequired,
        context?.activeProduct
      );

      return formatSuggestions(suggestions);
    }

    case 'boolean_expression': {
      if (expressionRoot) {
        if (
          isBooleanExpressionFinished(expressionRoot, innerText, context, {
            traverseRightmost: true,
          })
        ) {
          return buildNextActions({ includeBinaryOperators: true });
        }
      }

      return await suggestForExpression({
        innerText,
        getColumnsByType: callbacks.getByType,
        expressionRoot,
        location: Location.WHERE,
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

function createInferenceEndpointToCompletionItem(
  inferenceEndpoint: InferenceEndpointAutocompleteItem
): ISuggestionItem {
  return {
    detail: i18n.translate('kbn-esql-ast.esql.definitions.rerankInferenceIdDoc', {
      defaultMessage: 'Inference endpoint used for the completion',
    }),
    kind: 'Reference',
    label: inferenceEndpoint.inference_id,
    sortText: '1',
    text: inferenceEndpoint.inference_id,
  };
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

  if (includeAssign) {
    items.push({ ...assignCompletionItem, text: ' = ', sortText: '02' });
  }

  if (includeBinaryOperators) {
    items.push({ ...andCompleteItem, sortText: '05' }, { ...orCompleteItem, sortText: '06' });
  }

  return items;
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

/**
 * Unified suggestion formatter
 */
function formatSuggestions(suggestions: ISuggestionItem[], withSpace = true): ISuggestionItem[] {
  if (!withSpace) {
    return suggestions;
  }

  return suggestions.map((suggestion) => ({
    ...suggestion,
    text: /\s$/.test(suggestion.text) ? suggestion.text : suggestion.text + ' ',
    command:
      suggestion.command ?? (TRIGGER_SUGGESTION_COMMAND as unknown as ISuggestionItem['command']),
  }));
}
