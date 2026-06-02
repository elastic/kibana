/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type AstNode = Ast | AstFunction | AstArgument;
export interface Ast {
  type: 'expression';
  chain: AstFunction[];
}
export interface AstFunction {
  type: 'function';
  function: string;
  arguments: Record<string, AstArgument[]>;
}
export type AstArgument = string | boolean | number | Ast;
interface WithMeta<T> {
  start: number;
  end: number;
  text: string;
  node: T;
}
type Replace<T, R> = Pick<T, Exclude<keyof T, keyof R>> & R;
type WrapAstArgumentWithMeta<T> = T extends Ast ? AstWithMeta : WithMeta<T>;
export type AstArgumentWithMeta = WrapAstArgumentWithMeta<AstArgument>;
export type AstFunctionWithMeta = WithMeta<
  Replace<
    AstFunction,
    {
      arguments: {
        [key: string]: AstArgumentWithMeta[];
      };
    }
  >
>;
export type AstWithMeta = WithMeta<
  Replace<
    Ast,
    {
      chain: AstFunctionWithMeta[];
    }
  >
>;
export declare function isAstWithMeta(value: any): value is AstWithMeta;
export declare function isAst(value: any): value is Ast;
export {};
