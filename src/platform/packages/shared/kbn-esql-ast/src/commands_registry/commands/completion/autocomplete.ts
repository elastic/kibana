/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { uniqBy } from 'lodash';
import { withAutoSuggest } from '../../../definitions/utils/autocomplete/helpers';
import type * as ast from '../../../types';
import { getCommandMapExpressionSuggestions } from '../../../definitions/utils/autocomplete/map_expression';
import { EDITOR_MARKER } from '../../../definitions/constants';
import type { ESQLCommand, ESQLAstCompletionCommand } from '../../../types';
import {
  pipeCompleteItem,
  assignCompletionItem,
  getNewUserDefinedColumnSuggestion,
  withCompleteItem,
} from '../../complete_items';
import {
  getFieldsOrFunctionsSuggestions,
  findFinalWord,
  handleFragment,
  columnExists,
  createInferenceEndpointToCompletionItem,
} from '../../../definitions/utils/autocomplete/helpers';
import { buildConstantsDefinitions } from '../../../definitions/utils/literals';
import {
  type ISuggestionItem,
  Location,
  type ICommandContext,
  type ICommandCallbacks,
} from '../../types';
import { ESQL_VARIABLES_PREFIX } from '../../constants';
import { getExpressionType, isExpressionComplete } from '../../../definitions/utils/expressions';
import { getFunctionDefinition } from '../../../definitions/utils/functions';
import { getInsideFunctionsSuggestions } from '../../../definitions/utils/autocomplete/functions';

export enum CompletionPosition {
  AFTER_COMPLETION = 'after_completion',
  AFTER_TARGET_ID = 'after_target_id',
  AFTER_PROMPT_OR_TARGET = 'after_prompt_or_target',
  AFTER_PROMPT = 'after_prompt',
  WITHIN_MAP_EXPRESSION = 'within_map_expression',
  AFTER_COMMAND = 'after_command',
}

function getPosition(
  query: string,
  command: ESQLCommand,
  context?: ICommandContext
): CompletionPosition | undefined {
  const { prompt, targetField } = command as ESQLAstCompletionCommand;

  const paramsMap = command.args[1] as ast.ESQLMap | undefined;

  if (paramsMap?.text && paramsMap.incomplete) {
    return CompletionPosition.WITHIN_MAP_EXPRESSION;
  }

  if (paramsMap && !paramsMap.incomplete) {
    return CompletionPosition.AFTER_COMMAND;
  }

  const expressionRoot = prompt?.text !== EDITOR_MARKER ? prompt : undefined;
  const expressionType = getExpressionType(expressionRoot, context?.columns);

  if (isExpressionComplete(expressionType, query)) {
    return CompletionPosition.AFTER_PROMPT;
  }

  if (targetField && !targetField.incomplete) {
    return CompletionPosition.AFTER_TARGET_ID;
  }

  // If we are right after COMPLETION or if there is only one word with no space after it (for fragments).
  if (!expressionRoot?.text || /COMPLETION\s*\S*$/i.test(query)) {
    return CompletionPosition.AFTER_COMPLETION;
  }

  // We don't know if the expression is a prompt or a target field
  if (prompt.type === 'column' || (prompt.type === 'unknown' && prompt.name === 'unknown')) {
    return CompletionPosition.AFTER_PROMPT_OR_TARGET;
  }

  return undefined;
}
const promptText = 'Your prompt to the LLM.';
const promptSnippetText = `"$\{0:${promptText}}"`;

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
  const { prompt } = command as ESQLAstCompletionCommand;
  const position = getPosition(innerText, command, context);

  const endpoints = context?.inferenceEndpoints;

  const functionsSpecificSuggestions = await getInsideFunctionsSuggestions(
    innerText,
    cursorPosition,
    callbacks,
    context
  );

  if (functionsSpecificSuggestions?.length) {
    return functionsSpecificSuggestions;
  }

  switch (position) {
    case CompletionPosition.AFTER_COMPLETION:
    case CompletionPosition.AFTER_TARGET_ID: {
      const fieldsAndFunctionsSuggestions = uniqBy(
        await getFieldsOrFunctionsSuggestions(
          ['text', 'keyword', 'unknown'],
          Location.COMPLETION,
          callbacks?.getByType,
          {
            functions: true,
            columns: true,
          },
          {},
          callbacks?.hasMinimumLicenseRequired,
          context?.activeProduct
        ),
        'label'
      );

      const suggestions = await handleFragment(
        innerText,
        (fragment) => Boolean(columnExists(fragment, context) || getFunctionDefinition(fragment)),
        (_fragment: string, rangeToReplace?: { start: number; end: number }) => {
          return fieldsAndFunctionsSuggestions.map((suggestion) => {
            return withAutoSuggest({
              ...suggestion,
              text: `${suggestion.text} `,
              rangeToReplace,
            });
          });
        },
        () => []
      );

      const lastWord = findFinalWord(innerText);

      if (!lastWord) {
        suggestions.push({
          ...buildConstantsDefinitions([promptSnippetText], '', '1')[0],
          label: promptText,
          asSnippet: true,
        });
      }

      if (position !== CompletionPosition.AFTER_TARGET_ID) {
        suggestions.push(
          getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
        );
      }

      return suggestions;
    }

    case CompletionPosition.AFTER_PROMPT:
      return [
        {
          ...withCompleteItem,
          detail: i18n.translate('kbn-esql-ast.esql.definitions.completionWithDoc', {
            defaultMessage: 'Provide additional parameters for the LLM prompt.',
          }),
        },
      ];

    case CompletionPosition.AFTER_PROMPT_OR_TARGET: {
      const lastWord = findFinalWord(query);

      if (
        !lastWord.length &&
        !columnExists(prompt.text, context) &&
        !prompt.text.startsWith(ESQL_VARIABLES_PREFIX)
      ) {
        return [assignCompletionItem];
      }

      return [
        {
          ...withCompleteItem,
          detail: i18n.translate('kbn-esql-ast.esql.definitions.completionWithDoc', {
            defaultMessage: 'Provide additional parameters for the LLM prompt.',
          }),
        },
      ];
    }

    case CompletionPosition.WITHIN_MAP_EXPRESSION:
      const availableParameters = {
        inference_id: endpoints?.map(createInferenceEndpointToCompletionItem) || [],
      };

      return getCommandMapExpressionSuggestions(innerText, availableParameters);

    case CompletionPosition.AFTER_COMMAND:
      return [pipeCompleteItem];

    default:
      return [];
  }
}
