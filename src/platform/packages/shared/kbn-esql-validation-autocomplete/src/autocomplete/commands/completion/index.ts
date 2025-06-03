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
import { EDITOR_MARKER } from '../../../shared/constants';
import { pipeCompleteItem } from '../../complete_items';
import { CommandSuggestParams, Location } from '../../../definitions/types';

import type { SuggestionRawDefinition } from '../../types';
import { isExpressionComplete, suggestForExpression } from '../../helper';

export enum CompletionPosition {
  PROMPT = 'prompt',
  AFTER_PROMPT = 'after_prompt',
  AFTER_WITH = 'with',
  AFTER_INFERENCE_ID = 'inference_id',
  AS = 'as',
  AFTER_TARGET_ID = 'target_id',
}

function getPosition(params: CommandSuggestParams<'completion'>): CompletionPosition | undefined {
  const { innerText, getExpressionType } = params;
  const command = params.command as ESQLAstCompletionCommand;

  // COMPLETION <prompt> WITH^
  if (/WITH\s*$/i.test(innerText)) {
    return CompletionPosition.AFTER_WITH;
  }
  // COMPLETION <prompt> WITH <inferenceId>^
  if (/WITH\s+\S*\s*$/i.test(innerText)) {
    return CompletionPosition.AFTER_INFERENCE_ID;
  }
  // COMPLETION <prompt> WITH <inferenceId> AS^
  if (/AS\s*$/i.test(innerText)) {
    return CompletionPosition.AS;
  }
  // COMPLETION <prompt> WITH <inferenceId> AS <targetId>^
  if (/AS\s+\S*\s*$/i.test(innerText)) {
    return CompletionPosition.AFTER_TARGET_ID;
  }

  if (/COMPLETION\s+\S*(?!\s+WITH)\s*$/i.test(innerText)) {
    // COMPLETION <prompt>^
    const expressionRoot = command.prompt?.text !== EDITOR_MARKER ? command.prompt : undefined;
    const expressionType = getExpressionType(expressionRoot);

    if (isExpressionComplete(expressionType, innerText)) {
      return CompletionPosition.AFTER_PROMPT;
    }

    // COMPLETION ^
    return CompletionPosition.PROMPT;
  }
  return undefined;
}

export async function suggest(
  params: CommandSuggestParams<'completion'>
): Promise<SuggestionRawDefinition[]> {
  const command = params.command as ESQLAstCompletionCommand;

  const position = getPosition(params);

  switch (position) {
    case CompletionPosition.PROMPT:
      const expressionRoot = command.prompt?.text !== EDITOR_MARKER ? command.prompt : undefined;
      return await suggestForExpression({
        ...params,
        expressionRoot,
        location: Location.COMPLETION,
        preferredExpressionType: 'text',
      });

    case CompletionPosition.AFTER_PROMPT:
      return [withCompletionItem];

    case CompletionPosition.AFTER_WITH:
      // Must fetch inference endpoints from API.
      return [];

    case CompletionPosition.AFTER_INFERENCE_ID:
      return [asCompletionItem, pipeCompleteItem];

    case CompletionPosition.AFTER_TARGET_ID:
      return [pipeCompleteItem];

    default:
      return [];
  }
}

const withCompletionItem: SuggestionRawDefinition = {
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.completionWithDoc', {
    defaultMessage: 'With',
  }),
  kind: 'Reference',
  label: 'WITH',
  sortText: '1',
  text: 'WITH ',
};

const asCompletionItem: SuggestionRawDefinition = {
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.completionAsDoc', {
    defaultMessage: 'As',
  }),
  kind: 'Reference',
  label: 'AS',
  sortText: '1',
  text: 'AS ',
};
