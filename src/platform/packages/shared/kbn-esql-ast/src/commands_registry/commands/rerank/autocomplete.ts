/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { withAutoSuggest } from '../../../definitions/utils/autocomplete/helpers';
import type { ESQLAstRerankCommand, ESQLSingleAstItem, ESQLAstAllCommands } from '../../../types';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../../types';
import { Location } from '../../types';
import { getPosition, CaretPosition } from './utils';
import {
  getNewUserDefinedColumnSuggestion,
  onCompleteItem,
  assignCompletionItem,
  withMapCompleteItem,
} from '../../complete_items';
import {
  withinQuotes,
  createInferenceEndpointToCompletionItem,
  handleFragment,
  columnExists,
} from '../../../definitions/utils/autocomplete/helpers';
import { suggestForExpression } from '../../../definitions/utils';
import { buildConstantsDefinitions } from '../../../definitions/utils/literals';
import type { MapParameters } from '../../../definitions/utils/autocomplete/map_expression';
import { getCommandMapExpressionSuggestions } from '../../../definitions/utils/autocomplete/map_expression';
import { pipeCompleteItem, commaCompleteItem, withCompleteItem } from '../../complete_items';
import { getExpressionType, isExpressionComplete } from '../../../definitions/utils/expressions';

export const QUERY_TEXT = 'Your search query' as const;
export const QUERY_TEXT_SNIPPET = `"$\{0:${QUERY_TEXT}}"`;

const FIELD_LIST_TYPES = ['keyword', 'text', 'boolean', 'integer', 'double', 'long'] as const;

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  const rerankCommand = command as ESQLAstRerankCommand;
  const innerText = query.substring(0, cursorPosition);

  if (!callbacks?.getByType || withinQuotes(innerText)) {
    return [];
  }

  const { position, context: positionContext } = getPosition(innerText, command, cursorPosition);

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
        query,
        command,
        cursorPosition,
        callbacks,
        context,
        expressionRoot: positionContext?.expressionRoot,
        insideFunction: positionContext?.insideFunction,
      });
    }

    case CaretPosition.AFTER_WITH_KEYWORD:
      return [withMapCompleteItem];

    case CaretPosition.WITHIN_MAP_EXPRESSION: {
      const endpoints = context?.inferenceEndpoints;
      const availableParameters: MapParameters = {
        inference_id: {
          type: 'string',
          suggestions: endpoints?.map(createInferenceEndpointToCompletionItem) || [],
        },
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
  query,
  command,
  cursorPosition,
  callbacks,
  context,
  expressionRoot,
  insideFunction,
}: {
  query: string;
  command: ESQLAstAllCommands;
  cursorPosition: number;
  callbacks: ICommandCallbacks;
  context: ICommandContext | undefined;
  expressionRoot: ESQLSingleAstItem | undefined;
  insideFunction?: boolean;
}): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const suggestions = await suggestForExpression({
    query,
    expressionRoot,
    command,
    cursorPosition,
    location: Location.RERANK,
    context,
    callbacks,
    options: {
      preferredExpressionType: 'boolean',
    },
  });

  if (expressionRoot) {
    const expressionType = getExpressionType(expressionRoot, context?.columns);

    if (
      expressionType === 'boolean' &&
      isExpressionComplete(expressionType, innerText) &&
      !insideFunction
    ) {
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
