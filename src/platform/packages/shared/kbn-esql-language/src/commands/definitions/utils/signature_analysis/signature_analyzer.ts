/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SupportedDataType, FunctionParameterType, FunctionParameter } from '../../types';
import type { Signature } from '../../types';
import { argMatchesParamType, pairKeywordAndTextTypes } from './matchers';
import {
  areParamsHomogeneous,
  hasVariadicSignature,
  hasRepeatingSignature,
  hasArbitraryExpressionSignature,
} from './traits';
import type { SignatureState, FunctionParameterContext } from './types';

/** Detects when the cursor is on a value param position of a repeating signature such as `CASE`. */
export function isAtRepeatingValuePosition(state: SignatureState): boolean {
  return hasRepeatingSignature(state.signatures) && state.currentParameterIndex >= 1;
}

/**
 * Detects param positions that can mean two different things.
 *
 * Example: in `CASE(cond1, value1, /)` the third param position could be either a new condition
 * or the final default value, so autocomplete should stay permissive.
 */
export function isAmbiguousPosition(state: SignatureState): boolean {
  return (
    hasRepeatingSignature(state.signatures) &&
    state.currentParameterIndex >= 2 &&
    state.currentParameterIndex % 2 === 0
  );
}

/** Tells callers whether another argument can still be added. */
export function canAcceptMoreArgs(state: SignatureState): boolean {
  if (state.hasMoreMandatoryArgs) {
    return true;
  }

  if (hasVariadicSignature(state.signatures)) {
    return true;
  }

  return !isAtMaxParams(state) && maxParams(state.signatures) > 0;
}

/** Checks whether the current param position accepts a given type. */
export function isCurrentTypeCompatible(
  state: SignatureState,
  givenType: SupportedDataType | 'unknown',
  givenIsLiteral: boolean
): boolean {
  if (state.paramDefinitions.length > 0) {
    return state.paramDefinitions.some((def) =>
      argMatchesParamType(givenType, def.type, givenIsLiteral, false)
    );
  }

  if (hasVariadicSignature(state.signatures) && state.firstArgumentType) {
    return argMatchesParamType(givenType, state.firstArgumentType, givenIsLiteral, false);
  }

  return false;
}

/** Checks a candidate expression against the current param position. */
export function doesParamAcceptType(
  state: SignatureState,
  expressionType: SupportedDataType | 'unknown',
  expressionIsLiteral: boolean
): boolean {
  if (state.paramDefinitions.length === 0) {
    if (hasVariadicSignature(state.signatures) && state.firstArgumentType) {
      return argMatchesParamType(
        expressionType,
        state.firstArgumentType as FunctionParameterType,
        expressionIsLiteral,
        false
      );
    }

    return false;
  }

  return state.paramDefinitions.some((def) =>
    argMatchesParamType(expressionType, def.type, expressionIsLiteral, false)
  );
}

/**
 * Builds the effective parameter choices for the current param position.
 *
 * Example: for `CASE(cond1, value1, /)` we return both `[boolean, any]` so the caller
 * can suggest either a new condition or a default value.
 */
export function getCompatibleParamDefs(state: SignatureState): FunctionParameter[] {
  const repeatingSignature = state.signatures.find((sig) => sig.isSignatureRepeating);

  if (repeatingSignature && state.currentParameterIndex >= repeatingSignature.params.length) {
    const paramIndex = state.currentParameterIndex % repeatingSignature.params.length;

    if (paramIndex === 0) {
      return repeatingSignature.params;
    }

    return [repeatingSignature.params[paramIndex]];
  }

  return state.paramDefinitions;
}

/**
 * Builds the list of types worth suggesting at the current param position.
 *
 * This keeps `CASE` permissive in condition/default param positions while still enforcing result-type
 * homogeneity once the first value branch is known.
 */
export function getAcceptedParamTypes(state: SignatureState): FunctionParameterType[] {
  if (isAmbiguousPosition(state)) {
    return ['any'];
  }

  if (hasArbitraryExpressionSignature(state.signatures)) {
    if (
      isAtRepeatingValuePosition(state) &&
      state.firstValueType &&
      state.firstValueType !== 'unknown'
    ) {
      return textualOrSingle(state.firstValueType);
    }

    return ['any'];
  }

  if (areParamsHomogeneous(state.signatures) && state.firstArgumentType === 'boolean') {
    return ['any'];
  }

  if (
    areParamsHomogeneous(state.signatures) &&
    state.firstArgumentType &&
    state.firstArgumentType !== 'unknown'
  ) {
    return textualOrSingle(state.firstArgumentType);
  }

  if (state.paramDefinitions.length > 0) {
    const types = state.paramDefinitions.map(({ type }) => type);

    return pairKeywordAndTextTypes(types);
  }

  return ['any'];
}

/** Checks a type at the current param position using the same rules as autocomplete. */
export function isTypeAcceptedAtPosition(
  state: SignatureState,
  expressionType: SupportedDataType | 'unknown',
  expressionIsLiteral: boolean
): boolean {
  const repeatingSignature = state.signatures.find((sig) => sig.isSignatureRepeating);

  if (repeatingSignature) {
    const { params } = repeatingSignature;
    const paramIndex = state.currentParameterIndex % params.length;
    const param = params[paramIndex];

    const isConditionPosition = paramIndex === 0;
    const effectiveIsLiteral =
      isConditionPosition && param.type === 'boolean' ? false : expressionIsLiteral;

    return argMatchesParamType(expressionType, param.type, effectiveIsLiteral, false);
  }

  return isCurrentTypeCompatible(state, expressionType, expressionIsLiteral);
}

/** Reads the `mapParams` hint from function signatures. */
export function extractSignatureMapParams(
  signatures: Array<{ params: Array<{ mapParams?: string }> }>
): string | undefined {
  return signatures.flatMap(({ params }) => params).find(({ mapParams }) => mapParams)?.mapParams;
}

/** Converts autocomplete context into the shared state used by this module. */
export function toSignatureState(context: FunctionParameterContext): SignatureState {
  const signatures =
    context.validSignatures && context.validSignatures.length > 0
      ? context.validSignatures
      : context.functionDefinition?.signatures ?? [];

  return {
    signatures,
    paramDefinitions: context.paramDefinitions ?? [],
    firstArgumentType: context.firstArgumentType,
    firstValueType: context.firstValueType,
    currentParameterIndex: context.currentParameterIndex ?? 0,
    hasMoreMandatoryArgs: Boolean(context.hasMoreMandatoryArgs),
  };
}

/** Finds the largest declared arity in a signature set. */
function maxParams(signatures: Signature[]): number {
  if (signatures.length === 0) {
    return 0;
  }

  return Math.max(...signatures.map(({ params }) => params.length));
}

/** Expands textual types to both `text` and `keyword`. */
function textualOrSingle(type: SupportedDataType | 'unknown'): FunctionParameterType[] {
  const isTextual = type === 'text' || type === 'keyword';

  return isTextual ? ['text', 'keyword'] : [type as FunctionParameterType];
}

/** Detects when a fixed-arity call is already at its last param position. */
function isAtMaxParams(state: SignatureState): boolean {
  if (hasVariadicSignature(state.signatures)) {
    return false;
  }

  return state.currentParameterIndex >= maxParams(state.signatures) - 1;
}
