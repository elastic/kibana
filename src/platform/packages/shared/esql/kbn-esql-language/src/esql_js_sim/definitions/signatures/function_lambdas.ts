/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The argument of a function that is a lambda, as `v -> v > 1`. */
export interface FunctionLambda {
  /** Which argument of the function it is, from zero. */
  argument: number;
  /** How many parameters the lambda takes. */
  parameters: number;
  /**
   * The argument whose values the parameters stand for, from zero, as the list a filter goes
   * through. A parameter has the type of that argument.
   */
  valuesOf?: number;
}

/**
 * The functions that take a lambda, by name. The grammar allows a lambda as any argument of
 * any function; which argument really takes one is a fact of the function's signature. No
 * function Kibana knows declares one yet, so this is empty until the function definitions do.
 */
export const FUNCTION_LAMBDAS: Record<string, FunctionLambda> = {};
