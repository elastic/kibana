/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { withAutoSuggest } from '../../../definitions/utils/autocomplete/helpers';
import type { ESQLCommand, ESQLAstRerankCommand, ESQLSingleAstItem } from '../../../types';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../../types';
import { Location } from '../../types';
import { getPosition, CaretPosition } from './utils';
import {
  getNewUserDefinedColumnSuggestion,
  onCompleteItem,
  assignCompletionItem,
} from '../../complete_items';
import {
  suggestForExpression,
  withinQuotes,
  createInferenceEndpointToCompletionItem,
  handleFragment,
  columnExists,
} from '../../../definitions/utils/autocomplete/helpers';
import { buildConstantsDefinitions } from '../../../definitions/utils/literals';
import { getCommandMapExpressionSuggestions } from '../../../definitions/utils/autocomplete/map_expression';
import { getInsideFunctionsSuggestions } from '../../../definitions/utils/autocomplete/functions';
import { pipeCompleteItem, commaCompleteItem, withCompleteItem } from '../../complete_items';
import { getExpressionType, isExpressionComplete } from '../../../definitions/utils/expressions';

export const QUERY_TEXT = 'Your search query' as const;
export const QUERY_TEXT_SNIPPET = `"$\{0:${QUERY_TEXT}}"`;

const FIELD_LIST_TYPES = ['keyword', 'text', 'boolean', 'integer', 'double', 'long'] as const;

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const rerankCommand = command as ESQLAstRerankCommand;
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
      const targetField = getNewUserDefinedColumnSuggestion(
        callbacks.getSuggestedUserDefinedColumnName?.() || ''
      );

      return [
        targetField,
        {
          ...buildConstantsDefinitions([QUERY_TEXT_SNIPPET], '', '1')[0],
          label: QUERY_TEXT,
          asSnippet: true,
        },
      ];
    }

    case CaretPosition.RERANK_AFTER_TARGET_FIELD: {
      return [assignCompletionItem];
    }

    case CaretPosition.RERANK_AFTER_TARGET_ASSIGNMENT: {
      return [
        {
          ...buildConstantsDefinitions([QUERY_TEXT_SNIPPET], '', '1')[0],
          label: QUERY_TEXT,
          asSnippet: true,
        },
      ];
    }

    case CaretPosition.ON_KEYWORD: {
      return [onCompleteItem];
    }

    case CaretPosition.ON_WITHIN_FIELD_LIST: {
      return handleOnFieldList({
        innerText,
        callbacks,
        context,
        rerankCommand,
      });
    }

    case CaretPosition.ON_KEEP_SUGGESTIONS_AFTER_TRAILING_SPACE: {
      const lastOnField = rerankCommand.fields?.[rerankCommand.fields.length - 1];
      const isAssignmentContext = !!(lastOnField && !context?.columns?.has(lastOnField.name));
      // ON col0␣ → '=' suggestion using lastField from the ON clause
      if (isAssignmentContext) {
        return [assignCompletionItem];
      }

      return buildNextActions();
    }

    case CaretPosition.ON_EXPRESSION: {
      return handleOnExpression({
        innerText,
        callbacks,
        context,
        expressionRoot: positionContext?.expressionRoot,
      });
    }

    case CaretPosition.WITHIN_MAP_EXPRESSION: {
      const endpoints = context?.inferenceEndpoints;
      const availableParameters = {
        inference_id: endpoints?.map(createInferenceEndpointToCompletionItem) || [],
      };

      return getCommandMapExpressionSuggestions(innerText, availableParameters);
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

async function handleOnFieldList({
  innerText,
  callbacks,
  context,
}: {
  innerText: string;
  callbacks: ICommandCallbacks;
  context: ICommandContext | undefined;
  rerankCommand: ESQLAstRerankCommand;
}): Promise<ISuggestionItem[]> {
  const fieldSuggestions = (await callbacks.getByType?.(FIELD_LIST_TYPES)) ?? [];

  const suggestions = await handleFragment(
    innerText,
    (fragment) => columnExists(fragment, context),
    // incomplete: get available fields suggestions
    (_: string, rangeToReplace?: { start: number; end: number }) => {
      const customFieldSuggestion = getNewUserDefinedColumnSuggestion(
        callbacks.getSuggestedUserDefinedColumnName?.() || ''
      );

      return [customFieldSuggestion, ...fieldSuggestions].map((suggestion) => {
        return withAutoSuggest({
          ...suggestion,
          rangeToReplace,
        });
      });
    },
    // complete: get next actions suggestions for completed field
    (fragment: string, rangeToReplace: { start: number; end: number }) => {
      const results = buildNextActions({ withSpaces: true });

      return results.map((suggestion) => ({
        ...suggestion,
        filterText: fragment,
        text: fragment + suggestion.text,
        rangeToReplace,
      }));
    }
  );

  return suggestions;
}

async function handleOnExpression({
  innerText,
  callbacks,
  context,
  expressionRoot,
}: {
  innerText: string;
  callbacks: ICommandCallbacks;
  context: ICommandContext | undefined;
  expressionRoot: ESQLSingleAstItem | undefined;
}): Promise<ISuggestionItem[]> {
  const suggestions = await suggestForExpression({
    innerText,
    getColumnsByType: callbacks.getByType,
    expressionRoot,
    location: Location.RERANK,
    preferredExpressionType: 'boolean',
    context,
    hasMinimumLicenseRequired: callbacks.hasMinimumLicenseRequired,
    activeProduct: context?.activeProduct,
  });

  if (expressionRoot) {
    const expressionType = getExpressionType(expressionRoot, context?.columns);

    if (expressionType === 'boolean' && isExpressionComplete(expressionType, innerText)) {
      suggestions.push(...buildNextActions());
    }
  }

  return suggestions;
}

export function buildNextActions(options?: { withSpaces?: boolean }): ISuggestionItem[] {
  const { withSpaces = false } = options || {};

  const items: ISuggestionItem[] = [];

  items.push({
    ...withCompleteItem,
    text: withSpaces ? ' ' + withCompleteItem.text + ' ' : withCompleteItem.text,
    sortText: '01',
  });

  items.push(
    withAutoSuggest({
      ...commaCompleteItem,
      text: commaCompleteItem.text + ' ',
      sortText: '02',
    })
  );

  items.push({
    ...pipeCompleteItem,
    text: withSpaces ? ' ' + pipeCompleteItem.text : pipeCompleteItem.text,
    sortText: '03',
  });

  return items;
}
