/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ExpressionFunctionDefinition, ExpressionValueRender } from 'src/plugins/expressions';

export type ExpressionRevealImageFunction = () => ExpressionFunctionDefinition<
  'revealImageExpr',
  number,
  Arguments,
  ExpressionValueRender<Output>
>;

/**
 * This type defines an entry in the `FunctionHelpMap`.  It uses 
 * an `ExpressionFunction` to infer its `Arguments` in order to strongly-type that 
 * entry.
 * 
 * For example:
 * 
```
   interface Arguments {
     bar: string;
     baz: number;
   }

   function foo(): ExpressionFunction<'foo', Context, Arguments, Return> {
     // ...
   }

   const help: FunctionHelp<typeof foo> = {
     help: 'Some help for foo',
     args: {
       bar: 'Help for bar.',   // pass; error if missing
       baz: 'Help for baz.',   // pass; error if missing
       zap: 'Help for zap.`,   // error: zap doesn't exist
     }
   };
```
 * This allows one to ensure each argument is present, and no extraneous arguments
 * remain.
 */
export type FunctionHelp<T> = T extends ExpressionFunctionDefinition<
  infer Name,
  infer Input,
  infer Arguments,
  infer Output
>
  ? {
      help: string;
      args: { [key in keyof Arguments]: string };
    }
  : never;

// This internal type infers a Function name and uses `FunctionHelp` above to build
// a dictionary entry.  This can be used to ensure every Function is defined and all
// Arguments have help strings.
//
// For example:
//
// function foo(): ExpressionFunction<'foo', Context, Arguments, Return> {
//   // ...
// }
//
// const map: FunctionHelpMap<typeof foo> = {
//   foo: FunctionHelp<typeof foo>,
// }
//
// Given a collection of functions, the map would contain each entry.
//
export type FunctionHelpMap<T> = T extends ExpressionFunctionDefinition<
  infer Name,
  infer Input,
  infer Arguments,
  infer Output
>
  ? { [key in Name]: FunctionHelp<T> }
  : never;

// This internal type represents an exhaustive dictionary of `FunctionHelp` types,
// organized by Function Name and then Function Argument.
//
// This type indexes the existing function factories, reverses the union to an
// intersection, and produces the dictionary of strings.
export type FunctionHelpDict = UnionToIntersection<FunctionHelpMap<ExpressionFunction>>;

export enum Position {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
}
