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
  private inComment: boolean = false;

  setInComment(inComment: boolean) {
    this.inComment = inComment;
  }

  isInComment() {
    return this.inComment;
  }

  clone(): monaco.languages.IState {
    const newState = new ESQLState();
    newState.setInComment(this.inComment);
    return newState;
  }

  equals(other: monaco.languages.IState): boolean {
    return false;
  }
}
