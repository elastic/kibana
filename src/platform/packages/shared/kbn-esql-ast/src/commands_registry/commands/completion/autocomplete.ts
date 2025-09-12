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
import type { InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import type * as ast from '../../../types';
import { getCommandMapExpressionSuggestions } from '../../../definitions/utils/autocomplete/map_expression';
import { EDITOR_MARKER } from '../../../definitions/constants';
import type { ESQLCommand, ESQLAstCompletionCommand } from '../../../types';
import {
  pipeCompleteItem,
  assignCompletionItem,
  getNewUserDefinedColumnSuggestion,
} from '../../complete_items';
import {
  getFieldsOrFunctionsSuggestions,
  findFinalWord,
  handleFragment,
  columnExists,
} from '../../../definitions/utils/autocomplete/helpers';
import {
  type ISuggestionItem,
  Location,
  type ICommandContext,
  type ICommandCallbacks,
} from '../../types';
import { TRIGGER_SUGGESTION_COMMAND, ESQL_VARIABLES_PREFIX } from '../../constants';
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

const defaultPrompt: ISuggestionItem = {
  detail: '',
  kind: 'Constant',
  asSnippet: true,
  label: 'Your prompt to the LLM',
  sortText: '1',
  text: '"${0:Your prompt to the LLM.}"',
};

const withCompletionItem: ISuggestionItem = {
  detail: i18n.translate('kbn-esql-ast.esql.definitions.completionWithDoc', {
    defaultMessage: 'Provide additional parameters for the LLM prompt.',
  }),
  kind: 'Reference',
  label: 'WITH',
  sortText: '1',
  asSnippet: true,
  text: 'WITH { $0 }',
  command: TRIGGER_SUGGESTION_COMMAND,
};

function inferenceEndpointToCompletionItem(
  inferenceEndpoint: InferenceEndpointAutocompleteItem
): ISuggestionItem {
  return {
    detail: i18n.translate('kbn-esql-ast.esql.definitions.completionInferenceIdDoc', {
      defaultMessage: 'Inference endpoint used for the completion',
    }),
    kind: 'Reference',
    label: inferenceEndpoint.inference_id,
    sortText: '1',
    text: inferenceEndpoint.inference_id,
  };
}

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
            return {
              ...suggestion,
              text: `${suggestion.text} `,
              command: TRIGGER_SUGGESTION_COMMAND,
              rangeToReplace,
            };
          });
        },
        () => []
      );

      const lastWord = findFinalWord(innerText);

      if (!lastWord) {
        suggestions.push(defaultPrompt);
      }

      if (position !== CompletionPosition.AFTER_TARGET_ID) {
        suggestions.push(
          getNewUserDefinedColumnSuggestion(
            (await callbacks?.getSuggestedUserDefinedColumnName?.()) || ''
          )
        );
      }

      return suggestions;
    }

    case CompletionPosition.AFTER_PROMPT:
      return [withCompletionItem];

    case CompletionPosition.AFTER_PROMPT_OR_TARGET: {
      const lastWord = findFinalWord(query);

      if (
        !lastWord.length &&
        !columnExists(prompt.text, context) &&
        !prompt.text.startsWith(ESQL_VARIABLES_PREFIX)
      ) {
        return [assignCompletionItem];
      }

      return [withCompletionItem];
    }

    case CompletionPosition.WITHIN_MAP_EXPRESSION:
      const availableParameters = {
        inference_id: endpoints?.map(inferenceEndpointToCompletionItem) || [],
      };

      return getCommandMapExpressionSuggestions(innerText, availableParameters);

    case CompletionPosition.AFTER_COMMAND:
      return [pipeCompleteItem];

    default:
      return [];
  }
}
