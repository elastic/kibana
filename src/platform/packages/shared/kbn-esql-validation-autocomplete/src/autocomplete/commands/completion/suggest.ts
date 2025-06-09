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
import { uniqBy } from 'lodash';
import { findFinalWord, getFunctionDefinition } from '../../../shared/helpers';
import { TRIGGER_SUGGESTION_COMMAND } from '../../factories';
import { EDITOR_MARKER } from '../../../shared/constants';
import { pipeCompleteItem } from '../../complete_items';
import { CommandSuggestParams, Location } from '../../../definitions/types';

import type { SuggestionRawDefinition } from '../../types';
import {
  getFieldsOrFunctionsSuggestions,
  handleFragment,
  isExpressionComplete,
} from '../../helper';

export enum CompletionPosition {
  PROMPT = 'prompt',
  AFTER_PROMPT = 'after_prompt',
  AFTER_WITH = 'with',
  AFTER_INFERENCE_ID = 'inference_id',
  AFTER_AS = 'as',
  AFTER_TARGET_ID = 'target_id',
}

function getPosition(params: CommandSuggestParams<'completion'>): CompletionPosition | undefined {
  const { innerText, getExpressionType } = params;
  const { prompt, inferenceId, targetField } = params.command as ESQLAstCompletionCommand;

  if (targetField) {
    return targetField.incomplete
      ? CompletionPosition.AFTER_AS
      : CompletionPosition.AFTER_TARGET_ID;
  }

  if (inferenceId.incomplete && /WITH\s*$/i.test(innerText)) {
    return CompletionPosition.AFTER_WITH;
  }

  if (!inferenceId.incomplete) {
    return CompletionPosition.AFTER_INFERENCE_ID;
  }

  const expressionRoot = prompt?.text !== EDITOR_MARKER ? prompt : undefined;
  const expressionType = getExpressionType(expressionRoot);

  if (isExpressionComplete(expressionType, innerText) && inferenceId.incomplete) {
    return CompletionPosition.AFTER_PROMPT;
  }

  if (!isExpressionComplete(expressionType, innerText)) {
    return CompletionPosition.PROMPT;
  }

  return undefined;
}

export async function suggest(
  params: CommandSuggestParams<'completion'>
): Promise<SuggestionRawDefinition[]> {
  const { references, innerText, columnExists, getColumnsByType } = params;

  const position = getPosition(params);

  switch (position) {
    case CompletionPosition.PROMPT:
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

      if (!findFinalWord(innerText)) {
        suggestions.push(defaultPrompt);
      }

      return suggestions;

    case CompletionPosition.AFTER_PROMPT:
      return [withCompletionItem];

    case CompletionPosition.AFTER_WITH:
      // Must fetch inference endpoints from API.
      return [];

    case CompletionPosition.AFTER_INFERENCE_ID:
      return [asCompletionItem, pipeCompleteItem];

    case CompletionPosition.AFTER_AS:
      return [targetIdCompletionItem];

    case CompletionPosition.AFTER_TARGET_ID:
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
};

const asCompletionItem: SuggestionRawDefinition = {
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.completionAsDoc', {
    defaultMessage: 'Name the result group, or use the default provided.',
  }),
  kind: 'Reference',
  label: 'AS',
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
  text: 'AS ',
};

const targetIdCompletionItem: SuggestionRawDefinition = {
  detail: i18n.translate(
    'kbn-esql-validation-autocomplete.esql.definitions.completionTargetIdDoc',
    {
      defaultMessage: 'Default target column',
    }
  ),
  command: TRIGGER_SUGGESTION_COMMAND,
  kind: 'Reference',
  label: 'completion',
  sortText: '1',
  text: 'completion ',
};
