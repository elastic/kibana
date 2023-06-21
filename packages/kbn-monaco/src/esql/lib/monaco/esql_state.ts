/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../../monaco_imports';

/** @internal **/
export class ESQLState implements monaco.languages.IState {
  clone(): monaco.languages.IState {
    return new ESQLState();
  }

  equals(other: monaco.languages.IState): boolean {
    return false;
  }
}
