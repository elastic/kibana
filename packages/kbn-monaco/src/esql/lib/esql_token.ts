/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../monaco_imports';
import { ESQL_TOKEN_POSTFIX } from './constants';

/** @internal **/
export class ESQLToken implements monaco.languages.IToken {
  scopes: string;

  constructor(ruleName: string, public startIndex: number, public stopIndex?: number) {
    this.scopes = ruleName.toLowerCase() + ESQL_TOKEN_POSTFIX;
  }
}
