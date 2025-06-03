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
import { pipeCompleteItem } from '../../complete_items';
import { CommandSuggestParams, Location } from '../../../definitions/types';

import type { SuggestionRawDefinition } from '../../types';
import { suggestForExpression } from '../../helper';

export async function suggest(
  params: CommandSuggestParams<'completion'>
): Promise<SuggestionRawDefinition[]> {
  const command = params.command as ESQLAstCompletionCommand;
  const { prompt, inferenceId, targetField } = command;

  // COMPLETION <prompt> WITH <inferenceId> AS <targetField> ^
  if (targetField && !targetField.incomplete) {
    return [pipeCompleteItem];
  }

  // COMPLETION <prompt> WITH <inferenceId> AS ^
  if (targetField && targetField.incomplete) {
    return [];
  }

  // COMPLETION <prompt> WITH <inferenceId> ^
  if (inferenceId && !inferenceId?.incomplete) {
    return [asCompletionItem, pipeCompleteItem];
  }

  // COMPLETION <prompt> WITH ^
  if (inferenceId && inferenceId.incomplete) {
    // Must fetch inference endpoints from API.
    return [];
  }

  // COMPLETION ^
  const suggestions = await suggestForExpression({
    ...params,
    expressionRoot: prompt,
    location: Location.COMPLETION,
    preferredExpressionType: 'text',
  });

  // COMPLETION <prompt> ^
  const expressionType = params.getExpressionType(prompt);
  if (['keyword', 'text'].includes(expressionType)) {
    return [withCompletionItem];
  }

  return suggestions;
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
