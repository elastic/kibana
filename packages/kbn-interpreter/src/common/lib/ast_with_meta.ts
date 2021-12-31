/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Ast, AstArgument, AstFunction } from './ast';

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
