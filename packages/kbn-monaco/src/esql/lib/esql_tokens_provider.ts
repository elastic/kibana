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
    return new ESQLLineTokens(
      tokenize(line).map((t) => new ESQLMonacoToken(t.name, t.start)),
      prevState.getLineNumber() + 1
    );
  }
}
