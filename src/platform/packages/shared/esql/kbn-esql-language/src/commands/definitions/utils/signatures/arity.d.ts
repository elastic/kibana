/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionDefinition, FunctionParameter, Signature } from '../../types';
/** Finds which parameter a given argument position belongs to. */
export declare function getParamAtPosition(
  signature: Signature,
  position: number,
  options?: {
    repeat?: boolean;
  }
): FunctionParameter | null;
/** Collects the parameter shapes allowed at one argument position across many signatures. */
export declare function getParamDefsAtPosition(
  signatures: Signature[],
  argIndex: number
): FunctionParameter[];
/** Computes the smallest and largest valid arity for a group of signatures. */
export declare function getMaxMinNumberOfParams(signatures: Signature[]): {
  min: number;
  max: number;
};
/** Checks whether one signature accepts the current number of arguments. */
export declare function matchesArity(
  signature: FunctionDefinition['signatures'][number],
  arity: number
): boolean;
