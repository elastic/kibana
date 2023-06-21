/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CharStreams, Token } from 'antlr4ts';
import { monaco } from '../../../monaco_imports';
import { ANTLREErrorListener } from '../../../common/error_listener';

import { ESQLToken } from './esql_token';
import { ESQLLineTokens } from './esql_line_tokens';
import { ESQLState } from './esql_state';

import { getLexer } from '../antlr_facade';
import { ESQL_TOKEN_POSTFIX } from '../constants';

const EOF = -1;

export class ESQLTokensProvider implements monaco.languages.TokensProvider {
  getInitialState(): monaco.languages.IState {
    return new ESQLState();
  }

  tokenize(line: string, state: monaco.languages.IState): monaco.languages.ILineTokens {
    const errorStartingPoints: number[] = [];
    const errorListener = new ANTLREErrorListener();
    const inputStream = CharStreams.fromString(line);
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
          const tokenTypeName = lexer.vocabulary.getSymbolicName(token.type);

          if (tokenTypeName) {
            const myToken = new ESQLToken(tokenTypeName, token.startIndex, token.stopIndex);
            myTokens.push(myToken);
          }
        }
      }
    } while (!done);

    for (const e of errorStartingPoints) {
      myTokens.push(new ESQLToken('error' + ESQL_TOKEN_POSTFIX, e));
    }

    myTokens.sort((a, b) => a.startIndex - b.startIndex);

    return new ESQLLineTokens(myTokens);
  }
}
