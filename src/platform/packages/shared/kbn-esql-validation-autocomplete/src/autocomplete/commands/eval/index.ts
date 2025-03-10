/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSingleAstItem } from '@kbn/esql-ast';
import { isAssignment } from '../../../..';
import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import { suggestForExpression } from '../where';
import { getPosition } from '../where/util';
import { getNewVariableSuggestion } from '../../factories';

export async function suggest(
  params: CommandSuggestParams<'eval'>
): Promise<SuggestionRawDefinition[]> {
  let expressionRoot = /,\s*$/.test(params.innerText)
    ? undefined
    : (params.command.args[params.command.args.length - 1] as ESQLSingleAstItem | undefined);

  if (expressionRoot && isAssignment(expressionRoot)) {
    // EVAL foo = <use this as the expression root>
    expressionRoot = expressionRoot.args[1][0] as ESQLSingleAstItem;
  }

  const suggestions = await suggestForExpression({
    ...params,
    expressionRoot,
    commandName: 'eval',
  });

  // EVAL-specific stuff
  const positionInExpression = getPosition(params.innerText, expressionRoot);
  if (positionInExpression === 'empty_expression') {
    suggestions.push(getNewVariableSuggestion(params.getSuggestedVariableName()));
  }

  return suggestions;
}
