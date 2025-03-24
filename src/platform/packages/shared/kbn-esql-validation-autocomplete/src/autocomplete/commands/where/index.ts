/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLSingleAstItem } from '@kbn/esql-ast';
import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import { pipeCompleteItem } from '../../complete_items';
import { buildPartialMatcher, suggestForExpression } from '../../helper';

const isNullMatcher = buildPartialMatcher('is nul');
const isNotNullMatcher = buildPartialMatcher('is not nul');

export async function suggest(
  params: CommandSuggestParams<'where'>
): Promise<SuggestionRawDefinition[]> {
  const expressionRoot = params.command.args[0] as ESQLSingleAstItem | undefined;
  const suggestions = await suggestForExpression({
    ...params,
    expressionRoot,
    commandName: 'where',
  });

  const isExpressionComplete =
    expressionRoot &&
    params.getExpressionType(expressionRoot) === 'boolean' &&
    // see https://github.com/elastic/kibana/issues/199401
    // for the reason we need this string check.
    !(isNullMatcher.test(params.innerText) || isNotNullMatcher.test(params.innerText));

  // Is this a complete boolean expression?
  // If so, we can call it done and suggest a pipe
  if (isExpressionComplete) {
    suggestions.push(pipeCompleteItem);
  }

  return suggestions;
}
