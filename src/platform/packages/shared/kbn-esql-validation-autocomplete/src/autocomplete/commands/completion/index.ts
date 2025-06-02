/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ESQLSingleAstItem } from '@kbn/esql-ast';
import { CommandSuggestParams, Location } from '../../../definitions/types';

import type { SuggestionRawDefinition } from '../../types';
import { isExpressionComplete, suggestForExpression } from '../../helper';

export async function suggest(
  params: CommandSuggestParams<'rename'>
): Promise<SuggestionRawDefinition[]> {
  const expressionRoot = params.command.args[0] as ESQLSingleAstItem | undefined;
  const suggestions = await suggestForExpression({
    ...params,
    expressionRoot,
    location: Location.COMPLETION,
    preferredExpressionType: 'text',
  });

  // Is this a complete text expression?
  // If so, we can call it done and suggest the WITH option
  const expressionType = params.getExpressionType(expressionRoot);
  if (
    ['keyword', 'text'].includes(expressionType) &&
    isExpressionComplete(expressionType, params.innerText)
  ) {
    suggestions.push(withCompletionItem);
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
