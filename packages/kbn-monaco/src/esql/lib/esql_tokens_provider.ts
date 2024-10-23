/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tokenize } from '@kbn/esql-ast';
import { monaco } from '../../monaco_imports';

import { ESQLLineTokens } from './esql_line_tokens';
import { ESQLState } from './esql_state';
import { ESQLMonacoToken } from './esql_token';

export class ESQLTokensProvider implements monaco.languages.TokensProvider {
  getInitialState(): monaco.languages.IState {
    return new ESQLState();
  }

  tokenize(line: string, prevState: ESQLState): monaco.languages.ILineTokens {
    const tokens = tokenize(line);

    // three comment cases
    // 1. a comment starts on this line
    // 2. a comment continues on this line
    // 3. a comment ends on this line

    // comment starts on this line
    const lastToken = tokens[tokens.length - 1];
    if (lastToken.name === 'multiline_comment_start') {
      lastToken.name = 'multiline_comment';
      return new ESQLLineTokens(
        tokens.map((t) => new ESQLMonacoToken(t.name, t.start)),
        true
      );
    }

    // comment ends on this line
    const commentEndPosition = tokens.findIndex((t) => t.name === 'multiline_comment_end');
    if (commentEndPosition !== -1 && prevState.isInComment()) {
      tokens.splice(0, commentEndPosition + 1);
      tokens.unshift({ name: 'multiline_comment', start: 0 });
      return new ESQLLineTokens(
        tokens.map((t) => new ESQLMonacoToken(t.name, t.start)),
        false
      );
    }

    // comment continues on this line
    if (prevState.isInComment()) {
      return new ESQLLineTokens(
        [{ name: 'multiline_comment', start: 0 }].map((t) => new ESQLMonacoToken(t.name, t.start)),
        true
      );
    }

    return new ESQLLineTokens(
      tokens.map((t) => new ESQLMonacoToken(t.name, t.start)),
      false
    );
  }
}
