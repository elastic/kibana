/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export type ExpressionArgAST = string | boolean | number | Ast;

export interface ExpressionFunctionAST {
  type: 'function';
  function: string;
  arguments: {
    [key: string]: ExpressionArgAST[];
  };
}

export interface Ast {
  type: 'expression';
  chain: ExpressionFunctionAST[];
}

export declare function fromExpression(expression: string): Ast;
export declare function toExpression(astObj: Ast, type?: string): string;
