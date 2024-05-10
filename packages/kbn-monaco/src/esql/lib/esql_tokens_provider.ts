/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CharStreams, type Token } from 'antlr4';
import { getLexer, ESQLErrorListener } from '@kbn/esql-ast';
import { monaco } from '../../monaco_imports';

import { ESQLToken } from './esql_token';
import { ESQLLineTokens } from './esql_line_tokens';
import { ESQLState } from './esql_state';

import { ESQL_TOKEN_POSTFIX } from './constants';
import { enrichTokensWithFunctionsMetadata } from './esql_token_helpers';

const EOF = -1;

export class ESQLTokensProvider implements monaco.languages.TokensProvider {
  getInitialState(): monaco.languages.IState {
    return new ESQLState();
  }

  tokenize(line: string, prevState: ESQLState): monaco.languages.ILineTokens {
    const errorStartingPoints: number[] = [];
    const errorListener = new ESQLErrorListener();
    // This has the drawback of not styling any ESQL wrong query as
    // | from ...
    const cleanedLine =
      prevState.getLineNumber() && line.trimStart()[0] === '|'
        ? line.trimStart().substring(1)
        : line;
    const inputStream = CharStreams.fromString(cleanedLine);
    const lexer = getLexer(inputStream, errorListener);

    let done = false;
    const myTokens: monaco.languages.IToken[] = [];

    do {
      let token: Token | null;
      try {
        token = lexer.nextToken();
      } catch (e) {
        token = null;
      }

      if (token == null) {
        done = true;
      } else {
        if (token.type === EOF) {
          done = true;
        } else {
          const tokenTypeName = lexer.symbolicNames[token.type];

          if (tokenTypeName) {
            const indexOffset = cleanedLine === line ? 0 : line.length - cleanedLine.length;
            const myToken = new ESQLToken(
              tokenTypeName,
              token.start + indexOffset,
              token.stop + indexOffset
            );
            myTokens.push(myToken);
          }
        }
      }
    } while (!done);

    for (const e of errorStartingPoints) {
      myTokens.push(new ESQLToken('error' + ESQL_TOKEN_POSTFIX, e));
    }

    myTokens.sort((a, b) => a.startIndex - b.startIndex);

    // special treatment for functions
    // the previous custom Kibana grammar baked functions directly as tokens, so highlight was easier
    // The ES grammar doesn't have the token concept of "function"
    const tokensWithFunctions = enrichTokensWithFunctionsMetadata(myTokens);

    return new ESQLLineTokens(tokensWithFunctions, prevState.getLineNumber() + 1);
  }
}
