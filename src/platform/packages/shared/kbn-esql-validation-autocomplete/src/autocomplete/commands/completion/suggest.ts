/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ESQLAstCompletionCommand } from '@kbn/esql-ast/src/types';
import { InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import { uniqBy } from 'lodash';
import { findFinalWord, getFunctionDefinition } from '../../../shared/helpers';
import { getNewUserDefinedColumnSuggestion, TRIGGER_SUGGESTION_COMMAND } from '../../factories';
import { EDITOR_MARKER, ESQL_VARIABLES_PREFIX } from '../../../shared/constants';
import { pipeCompleteItem } from '../../complete_items';
import { CommandSuggestParams, Location } from '../../../definitions/types';

import type { SuggestionRawDefinition } from '../../types';
import {
  getFieldsOrFunctionsSuggestions,
  handleFragment,
  isExpressionComplete,
} from '../../helper';

export enum CompletionPosition {
  AFTER_COMPLETION = 'after_completion',
  AFTER_PROMPT_OR_TARGET = 'after_prompt_or_target',
  AFTER_PROMPT = 'after_prompt',
  AFTER_WITH = 'after_with',
  AFTER_INFERENCE_ID = 'after_inference_id',
  AFTER_TARGET_ID = 'after_target_id',
}

function getPosition(params: CommandSuggestParams<'completion'>): CompletionPosition | undefined {
  const { innerText, getExpressionType } = params;
  const { prompt, inferenceId, targetField } = params.command as ESQLAstCompletionCommand;

  if (inferenceId.incomplete && /WITH\s*$/i.test(innerText)) {
    return CompletionPosition.AFTER_WITH;
  }

  if (!inferenceId.incomplete) {
    return CompletionPosition.AFTER_INFERENCE_ID;
  }

  const expressionRoot = prompt?.text !== EDITOR_MARKER ? prompt : undefined;
  const expressionType = getExpressionType(expressionRoot);

  if (isExpressionComplete(expressionType, innerText)) {
    return CompletionPosition.AFTER_PROMPT;
  }

  if (targetField && !targetField.incomplete) {
    return CompletionPosition.AFTER_TARGET_ID;
  }

  // If we are right after COMPLETION or if there is only one word with no space after it (for fragments).
  if (!expressionRoot?.text || /COMPLETION\s*\S*$/i.test(innerText)) {
    return CompletionPosition.AFTER_COMPLETION;
  }

  // We don't know if the expression is a prompt or a target field
  if (prompt.type === 'unknown' && prompt.name === 'unknown') {
    return CompletionPosition.AFTER_PROMPT_OR_TARGET;
  }

  return undefined;
}

export async function suggest(
  params: CommandSuggestParams<'completion'>
): Promise<SuggestionRawDefinition[]> {
  const {
    references,
    innerText,
    columnExists,
    getColumnsByType,
    callbacks,
    getSuggestedUserDefinedColumnName,
  } = params;

  const { prompt } = params.command as ESQLAstCompletionCommand;

  const position = getPosition(params);

  switch (position) {
    case CompletionPosition.AFTER_COMPLETION:
    case CompletionPosition.AFTER_TARGET_ID: {
      const fieldsAndFunctionsSuggestions = uniqBy(
        await getFieldsOrFunctionsSuggestions(
          ['text', 'keyword', 'unknown'],
          Location.COMPLETION,
          getColumnsByType,
          {
            functions: true,
            fields: true,
            userDefinedColumns: references?.userDefinedColumns,
          }
        ),
        'label'
      );

      const suggestions = await handleFragment(
        innerText,
        (fragment) => Boolean(columnExists(fragment) || getFunctionDefinition(fragment)),
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
        suggestions.push(getNewUserDefinedColumnSuggestion(getSuggestedUserDefinedColumnName()));
      }

      return suggestions;
    }

    case CompletionPosition.AFTER_PROMPT:
      return [withCompletionItem];

    case CompletionPosition.AFTER_PROMPT_OR_TARGET: {
      const lastWord = findFinalWord(innerText);

      if (
        !lastWord.length &&
        !columnExists(prompt.text) &&
        !prompt.text.startsWith(ESQL_VARIABLES_PREFIX)
      ) {
        return [assignCompletionItem];
      }

      return [withCompletionItem];
    }

    case CompletionPosition.AFTER_WITH:
      const result = await callbacks?.getInferenceEndpoints?.('completion');
      return result?.inferenceEndpoints?.map(inferenceEndpointToCompletionItem) || [];

    case CompletionPosition.AFTER_INFERENCE_ID:
      return [pipeCompleteItem];

    default:
      return [];
  }
}

const defaultPrompt: SuggestionRawDefinition = {
  detail: '',
  kind: 'Constant',
  asSnippet: true,
  label: 'Your prompt to the LLM',
  sortText: '1',
  text: '"${0:Your prompt to the LLM.}"',
};

const withCompletionItem: SuggestionRawDefinition = {
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.completionWithDoc', {
    defaultMessage: 'Provide additional parameters for the LLM prompt.',
  }),
  kind: 'Reference',
  label: 'WITH',
  sortText: '1',
  text: 'WITH ',
  command: TRIGGER_SUGGESTION_COMMAND,
};

const assignCompletionItem: SuggestionRawDefinition = {
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.newVarDoc', {
    defaultMessage: 'Define a new column',
  }),
  command: TRIGGER_SUGGESTION_COMMAND,
  label: '=',
  kind: 'Variable',
  sortText: '1',
  text: '= ',
};

function inferenceEndpointToCompletionItem(
  inferenceEndpoint: InferenceEndpointAutocompleteItem
): SuggestionRawDefinition {
  return {
    detail: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.completionInferenceIdDoc',
      {
        defaultMessage: 'Inference endpoint used for the completion',
      }
    ),
    kind: 'Reference',
    label: inferenceEndpoint.inference_id,
    sortText: '1',
    text: `\`${inferenceEndpoint.inference_id}\` `,
    command: TRIGGER_SUGGESTION_COMMAND,
  };
}
