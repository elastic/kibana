/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../monaco_imports';
import { ESQL_TOKEN_POSTFIX } from './constants';

function nonNullable<T>(value: T | undefined): value is T {
  return value != null;
}

export function enrichTokensWithFunctionsMetadata(
  tokens: monaco.languages.IToken[]
): monaco.languages.IToken[] {
  // need to trim spaces as "abs (arg)" is still valid as function
  const myTokensWithoutSpaces = tokens.filter(
    ({ scopes }) => scopes !== 'expr_ws' + ESQL_TOKEN_POSTFIX
  );
  // find out all unquoted_identifiers index
  const possiblyFunctions = myTokensWithoutSpaces
    .map((t, i) => (t.scopes === 'unquoted_identifier' + ESQL_TOKEN_POSTFIX ? i : undefined))
    .filter(nonNullable);

  // then check if the token next is an opening bracket
  for (const index of possiblyFunctions) {
    if (myTokensWithoutSpaces[index + 1]?.scopes === 'lp' + ESQL_TOKEN_POSTFIX) {
      // set the custom "functions" token (only used in theming)
      myTokensWithoutSpaces[index].scopes = 'functions' + ESQL_TOKEN_POSTFIX;
    }
  }
  return [...tokens];
}
