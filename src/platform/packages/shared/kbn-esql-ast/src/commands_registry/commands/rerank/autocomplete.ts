/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLAstRerankCommand } from '../../../types';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../../types';
import { Location } from '../../types';
import {
  getPosition,
  CaretPosition,
  createBasicConstants,
  onKeywordSuggestion,
  withKeywordSuggestion,
  createFieldAssignmentSuggestion,
  createInferenceEndpointToCompletionItem,
} from './utils';
import {
  pipeCompleteItem,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
} from '../../complete_items';
import {
  handleFragment,
  columnExists,
  getFieldsOrFunctionsSuggestions,
} from '../../../definitions/utils/autocomplete/helpers';
import { getCommandMapExpressionSuggestions } from '../../../definitions/utils/autocomplete/map_expression';
import { getInsideFunctionsSuggestions } from '../../../definitions/utils/autocomplete/functions';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { getFunctionDefinition } from '../../../definitions/utils/functions';

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
  const { fields } = command as ESQLAstRerankCommand;
  const position = getPosition(innerText, command);
  const endpoints = context?.inferenceEndpoints;

  const functionsContextSuggestions = await getInsideFunctionsSuggestions(
    innerText,
    cursorPosition,
    callbacks,
    context
  );

  if (functionsContextSuggestions?.length) {
    return functionsContextSuggestions;
  }

  switch (position) {
    case CaretPosition.RERANK_KEYWORD: {
      const label = callbacks?.getSuggestedUserDefinedColumnName?.() || '';
      const newColumn = getNewUserDefinedColumnSuggestion(label);

      return [newColumn, ...createBasicConstants()];
    }

    case CaretPosition.RERANK_AFTER_ASSIGNMENT: {
      return createBasicConstants();
    }

    case CaretPosition.ON_KEYWORD: {
      return [onKeywordSuggestion];
    }

    case CaretPosition.ON_AFTER: {
      const declaredFields = fields?.map(({ name }) => name) ?? [];
      const fieldSuggestions =
        (await callbacks?.getByType?.(['text', 'keyword', 'unknown'], declaredFields)) ?? [];

      return handleFragment(
        innerText,
        // Check if the fragment is a valid column name
        (fragment) => Boolean(columnExists(fragment, context) || getFunctionDefinition(fragment)),
        // After selecting a field, prioritize WITH/=/| suggestions
        (_: string, rangeToReplace?: { start: number; end: number }) => {
          return fieldSuggestions.map((suggestion) => ({
            ...suggestion,
            text: `${suggestion.text}`,
            command: TRIGGER_SUGGESTION_COMMAND,
            rangeToReplace,
          }));
        },
        // After selecting a field, prioritize comma to add more fields
        (fragment: string, rangeToReplace: { start: number; end: number }) => {
          const suggestions: ISuggestionItem[] = [
            { ...commaCompleteItem, text: ', ', sortText: '1' },
            { ...createFieldAssignmentSuggestion(), sortText: '2' },
            {
              ...withKeywordSuggestion,
              text: ' ' + withKeywordSuggestion.text + ' ',
              asSnippet: true,
              sortText: '3',
            },
            { ...pipeCompleteItem, text: ' | ', sortText: '4' },
          ];

          return suggestions.map((s) => ({
            ...s,
            filterText: fragment,
            text: fragment + s.text,
            rangeToReplace,
            command: TRIGGER_SUGGESTION_COMMAND,
          }));
        }
      );
    }

    case CaretPosition.ON_AFTER_FIELD_ASSIGNMENT: {
      return getFieldsOrFunctionsSuggestions(
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
    }

    case CaretPosition.ON_AFTER_FIELD_SPACE: {
      return [
        { ...commaCompleteItem, text: ', ', sortText: '1' },
        { ...createFieldAssignmentSuggestion(), sortText: '2' },
        { ...withKeywordSuggestion, sortText: '3' },
        { ...pipeCompleteItem, sortText: '4' },
      ];
    }

    case CaretPosition.WITHIN_MAP_EXPRESSION: {
      const availableParameters = {
        inference_id: endpoints?.map(createInferenceEndpointToCompletionItem) || [],
      };

      return getCommandMapExpressionSuggestions(innerText, availableParameters);
    }

    case CaretPosition.AFTER_COMMAND:
      return [pipeCompleteItem];

    default:
      return [];
  }
}
