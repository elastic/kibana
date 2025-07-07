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
import { InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import type { ESQLCommand, ESQLAstCompletionCommand } from '../../../types';
import {
  pipeCompleteItem,
  getNewUserDefinedColumnSuggestion,
  assignCompletionItem,
} from '../../utils/complete_items';
import {
  getFieldsOrFunctionsSuggestions,
  findFinalWord,
  handleFragment,
  columnExists,
} from '../../../definitions/utils/autocomplete';
import {
  type ISuggestionItem,
  Location,
  type ICommandContext,
  type ICommandCallbacks,
} from '../../types';
import { TRIGGER_SUGGESTION_COMMAND, ESQL_VARIABLES_PREFIX } from '../../constants';
import { EDITOR_MARKER } from '../../../parser/constants';
import { getExpressionType, isExpressionComplete } from '../../../definitions/utils/expressions';
import { getFunctionDefinition } from '../../../definitions/utils/functions';

export enum CompletionPosition {
  AFTER_COMPLETION = 'after_completion',
  AFTER_PROMPT_OR_TARGET = 'after_prompt_or_target',
  AFTER_PROMPT = 'after_prompt',
  AFTER_WITH = 'after_with',
  AFTER_INFERENCE_ID = 'after_inference_id',
  AFTER_TARGET_ID = 'after_target_id',
}

function getPosition(
  query: string,
  command: ESQLCommand,
  context?: ICommandContext
): CompletionPosition | undefined {
  const { prompt, inferenceId, targetField } = command as ESQLAstCompletionCommand;

  if (inferenceId.incomplete && /WITH\s*$/i.test(query)) {
    return CompletionPosition.AFTER_WITH;
  }

  if (!inferenceId.incomplete) {
    return CompletionPosition.AFTER_INFERENCE_ID;
  }

  const expressionRoot = prompt?.text !== EDITOR_MARKER ? prompt : undefined;
  const expressionType = getExpressionType(
    expressionRoot,
    context?.fields,
    context?.userDefinedColumns
  );

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
  if (prompt.type === 'unknown' && prompt.name === 'unknown') {
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
  text: 'WITH ',
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
    text: `\`${inferenceEndpoint.inference_id}\` `,
    command: TRIGGER_SUGGESTION_COMMAND,
  };
}

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }
  const { prompt } = command as ESQLAstCompletionCommand;

  const position = getPosition(query, command, context);

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
            fields: true,
            userDefinedColumns: context?.userDefinedColumns,
          }
        ),
        'label'
      );

      const suggestions = await handleFragment(
        query,
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

      const lastWord = findFinalWord(query);

      if (!lastWord) {
        suggestions.push(defaultPrompt);
      }

      if (position !== CompletionPosition.AFTER_TARGET_ID) {
        suggestions.push(
          getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
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

    case CompletionPosition.AFTER_WITH:
      const endpoints = context?.inferenceEndpoints;
      return endpoints?.map(inferenceEndpointToCompletionItem) || [];

    case CompletionPosition.AFTER_INFERENCE_ID:
      return [pipeCompleteItem];

    default:
      return [];
  }
}
