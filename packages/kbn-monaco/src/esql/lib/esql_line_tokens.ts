/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../monaco_imports';
import { ESQLState } from './esql_state';

/** @internal **/
export class ESQLLineTokens implements monaco.languages.ILineTokens {
  endState: ESQLState;
  tokens: monaco.languages.IToken[];

  constructor(tokens: monaco.languages.IToken[], line: number) {
    this.endState = new ESQLState();
    this.endState.setLineNumber(line);
    this.tokens = tokens;
  }
}
