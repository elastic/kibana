/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EventEmitter } from 'events';

export class ExpressionsInspectorAdapter extends EventEmitter {
  private _ast: any = {};

  public logAST(ast: any): void {
    this._ast = ast;
    this.emit('change', this._ast);
  }

  public get ast() {
    return this._ast;
  }
}
