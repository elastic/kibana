/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../monaco_imports';

/** @internal **/
export class ESQLState implements monaco.languages.IState {
  private lastLine: number = 0;

  setLineNumber(n: number) {
    this.lastLine = n;
  }

  getLineNumber() {
    return this.lastLine;
  }

  clone(): monaco.languages.IState {
    const newState = new ESQLState();
    newState.setLineNumber(this.lastLine);
    return newState;
  }

  equals(other: monaco.languages.IState): boolean {
    return false;
  }
}
