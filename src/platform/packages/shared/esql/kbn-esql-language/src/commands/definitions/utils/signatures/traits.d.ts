/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionParameter, Signature } from '../../types';
/** Detects whether a parameter only accepts constant values. */
export declare const isConstantParameter: (param: FunctionParameter) => boolean;
/** Detects signatures where all parameters are expected to stay on the same type family. */
export declare function areParamsHomogeneous(signatures: Signature[]): boolean;
/** Detects whether at least one signature is variadic. */
export declare function hasVariadicSignature(signatures: Signature[]): boolean;
/** Detects repeating signatures such as `CASE(condition, value, condition, value, ...)`. */
export declare function hasRepeatingSignature(signatures: Signature[]): boolean;
/**
 * Detects signatures that are meant to accept full expressions, not only simple values.
 *
 * Example: `CASE` mixes boolean conditions with result expressions.
 */
export declare function hasArbitraryExpressionSignature(signatures: Signature[]): boolean;
/** Detects whether a function family can start with a boolean parameter. */
export declare function hasBooleanSignature(signatures: Signature[]): boolean;
