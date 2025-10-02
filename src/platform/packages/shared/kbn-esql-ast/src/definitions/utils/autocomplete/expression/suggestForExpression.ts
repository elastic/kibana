/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLVariableType } from '@kbn/esql-types';
import type {
  ICommandCallbacks,
  ICommandContext,
  ISuggestionItem,
} from '../../../../commands_registry/types';
import type { Location } from '../../../../commands_registry/types';
import type { ESQLCommand, ESQLSingleAstItem } from '../../../../types';
import { nullCheckOperators } from '../../../all_operators';
import { getOverlapRange } from '../../shared';
import { getControlSuggestionIfSupported } from '../helpers';
import {
  buildExpressionContext,
  type BuildContextParams,
  type ExpressionContextOptions,
} from './context';
import * as handlers from './handlers';
import { getExpressionPosition } from './position';

export interface SuggestForExpressionParams {
  query: string;
  expressionRoot?: ESQLSingleAstItem;
  command: ESQLCommand;
  cursorPosition: number;
  location?: Location;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
  options?: ExpressionContextOptions;
}

const positionHandlers = {
  in_function: handlers.handleInFunction,
  after_operator: handlers.handleAfterOperator,
  after_column: handlers.handleAfterComplete,
  after_function: handlers.handleAfterComplete,
  after_literal: handlers.handleAfterComplete,
  after_not: handlers.handleAfterNot,
  empty_expression: handlers.handleEmptyExpression,
} as const;

export async function suggestForExpression(
  params: SuggestForExpressionParams
): Promise<ISuggestionItem[]> {
  const { query, command, cursorPosition, expressionRoot, location, context, callbacks, options } =
    params;

  const buildParams: BuildContextParams = {
    query,
    command,
    cursorPosition,
    context,
    callbacks,
    location,
    expressionRoot,
    options,
  };

  const ctx = buildExpressionContext(buildParams);

  if (!ctx.location && context?.supportsControls) {
    return getControlSuggestionIfSupported(
      context.supportsControls,
      ESQLVariableType.VALUES,
      context.variables
    );
  }

  if (!ctx.location) {
    return [];
  }

  ctx.position = getExpressionPosition(ctx.innerText, ctx.expressionRoot);

  const handler = positionHandlers[ctx.position];
  const suggestions = await handler(ctx);

  // Attach replacement ranges to handle operator spacing and partial matches
  attachRanges(ctx.innerText, suggestions);

  return suggestions;
}

function isNullCheckOperator(operatorText: string): boolean {
  const upperText = operatorText.toUpperCase();

  return nullCheckOperators.some(({ name }) => name.toUpperCase() === upperText);
}

function attachRanges(innerText: string, suggestions: ISuggestionItem[]) {
  const hasNonWhitespacePrefix = !/\s/.test(innerText[innerText.length - 1]);

  suggestions.forEach((suggestion) => {
    if (isNullCheckOperator(suggestion.text)) {
      suggestion.rangeToReplace = getOverlapRange(innerText, suggestion.text);

      return;
    }

    if (hasNonWhitespacePrefix) {
      const lastNonWhitespaceIndex = innerText.search(/\b\w(?=\w*$)/);

      suggestion.rangeToReplace = {
        start: lastNonWhitespaceIndex,
        end: innerText.length,
      };
    }
  });
}
