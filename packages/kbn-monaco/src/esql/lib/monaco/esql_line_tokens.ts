/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../../monaco_imports';
import { ESQLState } from './esql_state';

/** @internal **/
export class ESQLLineTokens implements monaco.languages.ILineTokens {
  endState: monaco.languages.IState;
  tokens: monaco.languages.IToken[];

  constructor(tokens: monaco.languages.IToken[]) {
    this.endState = new ESQLState();
    this.tokens = tokens;
  }
}
