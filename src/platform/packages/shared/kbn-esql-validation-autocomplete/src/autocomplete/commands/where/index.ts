/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLSingleAstItem } from '@kbn/esql-ast';
import { CommandSuggestParams, Location } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import { pipeCompleteItem } from '../../complete_items';
import { isExpressionComplete, suggestForExpression } from '../../helper';

export async function suggest(
  params: CommandSuggestParams<'where'>
): Promise<SuggestionRawDefinition[]> {
  const expressionRoot = params.command.args[0] as ESQLSingleAstItem | undefined;
  const suggestions = await suggestForExpression({
    ...params,
    expressionRoot,
    location: Location.WHERE,
    preferredExpressionType: 'boolean',
  });

  // Is this a complete boolean expression?
  // If so, we can call it done and suggest a pipe
  const expressionType = params.getExpressionType(expressionRoot);
  if (expressionType === 'boolean' && isExpressionComplete(expressionType, params.innerText)) {
    suggestions.push(pipeCompleteItem);
  }

  return suggestions;
}
