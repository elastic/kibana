/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SupportedDataType, FunctionParameterType, Signature } from '../../types';
export declare const PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING: FunctionParameterType[];
/** Detects result positions in repeating condition/value signatures such as CASE. */
export declare const isRepeatingValuePosition: (index: number, totalArgs: number) => boolean;
/** Checks whether one argument type can be used for one parameter type. */
export declare function argMatchesParamType(
  givenType: SupportedDataType | 'unknown',
  expectedType: FunctionParameterType,
  givenIsLiteral: boolean,
  acceptUnknown: boolean
): boolean;
/**
 * Keeps only the signatures that match the arguments typed so far.
 *
 * Example: for `CASE(cond1, value1, cond2, value2, default)`, this handles
 * condition param positions, value param positions, and the final default param position.
 */
export declare function getMatchingSignatures(
  signatures: Signature[],
  givenTypes: Array<SupportedDataType | 'unknown'>,
  literalMask: boolean[],
  acceptUnknown: boolean,
  acceptPartialMatches?: boolean
): Signature[];
/** Keeps `text` and `keyword` together in suggestions, even if only one appears in the signatures. */
export declare function pairKeywordAndTextTypes(
  types: FunctionParameterType[]
): FunctionParameterType[];
/** Lets matching treat `text` and `keyword` as the same string family. */
export declare function areCompatibleStringTypes(type1: string, type2: string): boolean;
