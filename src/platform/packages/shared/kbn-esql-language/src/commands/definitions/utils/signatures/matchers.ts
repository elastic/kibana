/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SupportedDataType, FunctionParameterType, Signature } from '../../types';
import { isArrayType } from '../../types';
import { matchesArity, getParamAtPosition } from './arity';

export const PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING: FunctionParameterType[] = [
  'date',
  'date_nanos',
  'date_period',
  'time_duration',
  'version',
  'ip',
  'boolean',
];

/** Types that are always compatible with other types in repeating signatures. */
const REPEATING_SIGNATURE_ALWAYS_COMPATIBLE_TYPES: SupportedDataType[] = [
  'null',
  'unknown',
  'param',
];

/** Checks whether one argument type can be used for one parameter type. */
export function argMatchesParamType(
  givenType: SupportedDataType | 'unknown',
  expectedType: FunctionParameterType,
  givenIsLiteral: boolean,
  acceptUnknown: boolean
): boolean {
  const normalizedExpectedType = isArrayType(expectedType)
    ? (expectedType.slice(0, -2) as FunctionParameterType)
    : expectedType;

  if (
    givenType === expectedType ||
    expectedType === 'any' ||
    givenType === 'param' ||
    // all ES|QL functions accept null, but this is not reflected
    // in our function definitions so we let it through here
    givenType === 'null' ||
    // Check array types
    givenType === normalizedExpectedType ||
    // all functions accept keywords for text parameters
    areCompatibleStringTypes(givenType, expectedType)
  ) {
    return true;
  }

  if (givenType === 'unknown') return acceptUnknown;

  if (
    givenIsLiteral &&
    givenType === 'keyword' &&
    PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING.includes(expectedType)
  )
    return true;

  return false;
}

/**
 * Keeps only the signatures that match the arguments typed so far.
 *
 * Example: for `CASE(cond1, value1, cond2, value2, default)`, this handles
 * condition param positions, value param positions, and the final default param position.
 */
export function getMatchingSignatures(
  signatures: Signature[],
  givenTypes: Array<SupportedDataType | 'unknown'>,
  literalMask: boolean[],
  acceptUnknown: boolean,
  acceptPartialMatches: boolean = false
): Signature[] {
  return signatures.filter((sig) => {
    const { isSignatureRepeating } = sig;

    if (isSignatureRepeating && !areRepeatingValuesCompatible(givenTypes)) {
      return false;
    }

    if (!acceptPartialMatches && !matchesArity(sig, givenTypes.length)) {
      return false;
    }

    const totalArgs = givenTypes.length;

    return givenTypes.every((givenType, index) => {
      const isDefault = !!isSignatureRepeating && totalArgs % 2 === 1 && index === totalArgs - 1;

      const param = getEffectiveParamAtPosition(sig, index, isDefault);

      if (!param) {
        return false;
      }

      const expectedType = isArrayType(param.type)
        ? (param.type.slice(0, -2) as FunctionParameterType)
        : param.type;
      const isConditionPosition = isSignatureRepeating && index % 2 === 0 && !isDefault;
      const effectiveIsLiteral =
        isConditionPosition && expectedType === 'boolean' ? false : literalMask[index];

      return argMatchesParamType(givenType, expectedType, effectiveIsLiteral, acceptUnknown);
    });
  });
}

/** Keeps `text` and `keyword` together in suggestions, even if only one appears in the signatures. */
export function pairKeywordAndTextTypes(types: FunctionParameterType[]): FunctionParameterType[] {
  const hasKeyword = types.includes('keyword');
  const hasText = types.includes('text');

  if (hasKeyword && !hasText) {
    return [...types, 'text'];
  }

  if (hasText && !hasKeyword) {
    return [...types, 'keyword'];
  }

  return types;
}

/** Lets matching treat `text` and `keyword` as the same string family. */
function areCompatibleStringTypes(type1: string, type2: string): boolean {
  return (type1 === 'text' || type1 === 'keyword') && (type2 === 'text' || type2 === 'keyword');
}

/** Maps an argument position to its effective parameter, including repeating signatures. */
function getEffectiveParamAtPosition(
  sig: Signature,
  index: number,
  isDefault: boolean
): ReturnType<typeof getParamAtPosition> {
  const { isSignatureRepeating, params, minParams } = sig;

  if (isSignatureRepeating && params.length > 0 && index >= params.length) {
    return isDefault ? params[1] : params[index % params.length];
  }

  return getParamAtPosition(sig, index, { repeat: !!minParams });
}

/**
 * Keeps value branches in repeating signatures on the same type family.
 *
 * Example: once `CASE` has a numeric value branch, later value branches should stay numeric.
 */
function areRepeatingValuesCompatible(givenTypes: Array<SupportedDataType | 'unknown'>): boolean {
  const { length } = givenTypes;
  const isValuePosition = (index: number) =>
    index % 2 === 1 || (length % 2 === 1 && index === length - 1);
  const valueTypes = givenTypes.filter(
    (type, index) =>
      isValuePosition(index) && !REPEATING_SIGNATURE_ALWAYS_COMPATIBLE_TYPES.includes(type)
  );
  const [first, ...rest] = valueTypes;

  if (!first) {
    return true;
  }

  return rest.every(
    (type) =>
      type === first ||
      areCompatibleStringTypes(first, type) ||
      (first === 'long' && type === 'integer')
  );
}
