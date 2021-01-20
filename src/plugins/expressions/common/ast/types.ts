/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionValue, ExpressionValueError } from '../expression_types';

export type ExpressionAstNode =
  | ExpressionAstExpression
  | ExpressionAstFunction
  | ExpressionAstArgument;

export type ExpressionAstExpression = {
  type: 'expression';
  chain: ExpressionAstFunction[];
};

export type ExpressionAstFunction = {
  type: 'function';
  function: string;
  arguments: Record<string, ExpressionAstArgument[]>;

  /**
   * Debug information added to each function when expression is executed in *debug mode*.
   */
  debug?: ExpressionAstFunctionDebug;
};

export type ExpressionAstFunctionDebug = {
  /**
   * True if function successfully returned output, false if function threw.
   */
  success: boolean;

  /**
   * Id of expression function.
   */
  fn: string;

  /**
   * Input that expression function received as its first argument.
   */
  input: ExpressionValue;

  /**
   * Map of resolved arguments expression function received as its second argument.
   */
  args: Record<string, ExpressionValue>;

  /**
   * Result returned by the expression function. Including an error result
   * if it was returned by the function (not thrown).
   */
  output?: ExpressionValue;

  /**
   * Error that function threw normalized to `ExpressionValueError`.
   */
  error?: ExpressionValueError;

  /**
   * Raw error that was thrown by the function, if any.
   */
  rawError?: any | Error;

  /**
   * Time in milliseconds it took to execute the function. Duration can be
   * `undefined` if error happened during argument resolution, because function
   * timing starts after the arguments have been resolved.
   */
  duration: number | undefined;
};

export type ExpressionAstArgument = string | boolean | number | ExpressionAstExpression;
