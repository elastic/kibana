/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CharStreams } from 'antlr4ts';
import { monaco } from '../../../../monaco_imports';

import { ESQLErrorListener } from '../../error_listener';
import { es_ql_lexer as ESQLLexer } from '../../../antlr/es_ql_lexer';
import { ESQLToken } from '../esql_token';
import { ESQLLineTokens } from '../esql_line_tokens';
import { tokenPostfix } from '../esql_constants';

const EOF = -1;

export function tokensForLine(input: string): monaco.languages.ILineTokens {
  const errorStartingPoints: number[] = [];
  const inputStream = CharStreams.fromString(input);
  const lexer = new ESQLLexer(inputStream);

  lexer.removeErrorListeners();
  const errorListener = new ESQLErrorListener();
  lexer.addErrorListener(errorListener);

  let done = false;
  const myTokens: monaco.languages.IToken[] = [];

  do {
    const token = lexer.nextToken();
    if (token == null) {
      done = true;
    } else {
      // We exclude EOF
      if (token.type === EOF) {
        done = true;
      } else {
        const tokenTypeName = lexer.ruleNames[token.type];
        const myToken = new ESQLToken(tokenTypeName, token.startIndex);
        myTokens.push(myToken);
      }
    }
  } while (!done);

  for (const e of errorStartingPoints) {
    myTokens.push(new ESQLToken('error' + tokenPostfix, e));
  }

  myTokens.sort((a, b) => (a.startIndex > b.startIndex ? 1 : -1));

  return new ESQLLineTokens(myTokens);
}
