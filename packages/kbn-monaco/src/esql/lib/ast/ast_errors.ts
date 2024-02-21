/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RecognitionException, ATN } from 'antlr4';
import { default as esql_parser } from '../../antlr/esql_parser';
import { getPosition } from './ast_position_utils';

function getExpectedSymbols(expectedTokens: ReturnType<ATN['getExpectedTokens']>) {
  return expectedTokens.intervals
    .reduce(
      (list, interval) =>
        list.concat(esql_parser.symbolicNames.slice(interval.start, interval.stop)),
      [] as Array<string | null>
    )
    .filter(Boolean);
}

export function createError(exception: RecognitionException) {
  const token = exception.offendingToken;

  if (token) {
    const expectedSymbols = getExpectedSymbols(
      // @ts-expect-error method exists see https://github.com/antlr/antlr4/blob/v4.11.1/runtime/JavaScript/src/antlr4/error/RecognitionException.js#L52
      exception.getExpectedTokens()
    );

    if (
      ['ASTERISK', 'UNQUOTED_IDENTIFIER', 'QUOTED_IDENTIFIER'].every(
        (s, i) => expectedSymbols[i] === s
      )
    ) {
      return {
        type: 'error' as const,
        text: `Unknown column ${token.text}`,
        location: getPosition(token),
      };
    }
  }

  return {
    type: 'error' as const,
    text: token
      ? `SyntaxError: expected {${getExpectedSymbols(
          // @ts-expect-error method exists see https://github.com/antlr/antlr4/blob/v4.11.1/runtime/JavaScript/src/antlr4/error/RecognitionException.js#L52
          exception.getExpectedTokens()
        ).join(', ')}} but found "${token.text}"`
      : exception.message,
    location: getPosition(token),
  };
}
