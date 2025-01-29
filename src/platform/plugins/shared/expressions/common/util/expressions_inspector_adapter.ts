/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import { ExpressionAstNode } from '..';

export class ExpressionsInspectorAdapter extends EventEmitter {
  private _ast = {} as ExpressionAstNode;

  logAST(ast: ExpressionAstNode): void {
    this._ast = ast;
    this.emit('change', this._ast);
  }

  public get ast(): ExpressionAstNode {
    return this._ast;
  }
}
