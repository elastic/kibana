/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AstNode } from './ast';
interface Options {
  /**
   * Node type.
   */
  type?: 'argument' | 'expression' | 'function';
  /**
   * Original expression to apply the new AST to.
   * At the moment, only arguments values changes are supported.
   */
  source?: string;
}
export declare function toExpression(ast: AstNode, options?: string | Options): string;
export {};
