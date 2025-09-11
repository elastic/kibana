/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniq } from 'lodash';
import {
  isColumn,
  isFunctionExpression,
  isInlineCast,
  isLiteral,
  isParamLiteral,
} from '../../ast/is';
import type { ESQLAstItem } from '../../types';
import { lastItem } from '../../visitor/utils';
import type {
  FunctionDefinition,
  FunctionParameterType,
  Signature,
  SupportedDataType,
} from '../types';
import { getFunctionDefinition } from './functions';
import { isArrayType } from './operators';
import { getColumnForASTNode } from './shared';
import type { ESQLColumnData } from '../../commands_registry/types';

// #region type detection

/**
 * Determines the type of the expression
 */
export function getExpressionType(
  root: ESQLAstItem | undefined,
  columns?: Map<string, ESQLColumnData>
): SupportedDataType | 'unknown' {
  if (!root) {
    return 'unknown';
  }

  if (Array.isArray(root)) {
    if (root.length === 0) {
      return 'unknown';
    }
    return getExpressionType(root[0], columns);
  }

  if (isLiteral(root)) {
    return root.literalType;
  }

  // from https://github.com/elastic/elasticsearch/blob/122e7288200ee03e9087c98dff6cebbc94e774aa/docs/reference/esql/functions/kibana/inline_cast.json
  if (isInlineCast(root)) {
    switch (root.castType) {
      case 'int':
        return 'integer';
      case 'bool':
        return 'boolean';
      case 'string':
        return 'keyword';
      case 'text':
        return 'keyword';
      case 'datetime':
        return 'date';
      default:
        return root.castType;
    }
  }

  if (isColumn(root) && columns) {
    const column = getColumnForASTNode(root, { columns });
    const lastArg = lastItem(root.args);
    // If the last argument is a param, we return its type (param literal type)
    // This is useful for cases like `where ??field`
    if (isParamLiteral(lastArg)) {
      return lastArg.literalType;
    }
    if (!column) {
      return 'unknown';
    }
    if ('hasConflict' in column && column.hasConflict) {
      return 'unknown';
    }
    return column.type;
  }

  if (root.type === 'list') {
    return getExpressionType(root.values[0], columns);
  }

  if (isFunctionExpression(root)) {
    const fnDefinition = getFunctionDefinition(root.name);
    if (!fnDefinition) {
      return 'unknown';
    }

    /**
     * Special case for COUNT(*) because
     * the "*" column doesn't match any
     * of COUNT's function definitions
     */
    if (
      fnDefinition.name === 'count' &&
      root.args[0] &&
      isColumn(root.args[0]) &&
      root.args[0].name === '*'
    ) {
      return 'long';
    }

    if (fnDefinition.name === 'case' && root.args.length) {
      /**
       * The CASE function doesn't fit our system of function definitions
       * and needs special handling. This is imperfect, but it's a start because
       * at least we know that the final argument to case will never be a conditional
       * expression, always a result expression.
       *
       * One problem with this is that if a false case is not provided, the return type
       * will be null, which we aren't detecting. But this is ok because we consider
       * userDefinedColumns and fields to be nullable anyways and account for that during validation.
       */
      return getExpressionType(root.args[root.args.length - 1], columns);
    }

    const argTypes = root.args.map((arg) => getExpressionType(arg, columns));
    const literalMask = root.args.map((arg) => isLiteral(arg));
    const matchingSignatures = getMatchingSignatures(
      fnDefinition.signatures,
      argTypes,
      literalMask,
      false
    );

    if (matchingSignatures.length > 0 && argTypes.includes('null')) {
      // if one of the arguments is null, the return type is null.
      // this is true for most (all?) functions in ES|QL
      // though it is not reflected in our function definitions
      // so we handle it here
      return 'null';
    }

    const returnTypes = uniq(matchingSignatures.map((sig) => sig.returnType));

    // no signature matched the provided arguments
    if (returnTypes.length === 0) return 'unknown';

    // ambiguous return type (i.e. we can't always identify the true
    // matching signature because we don't always know the types of the parameters)
    if (returnTypes.length > 1) return 'unknown';

    if (returnTypes[0] === 'any') {
      return 'unknown';
    }

    return returnTypes[0];
  }

  return 'unknown';
}

// #endregion type detection

// #region signature matching

export const PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING: FunctionParameterType[] = [
  'date',
  'date_nanos',
  'date_period',
  'time_duration',
  'version',
  'ip',
  'boolean',
];

/**
 * Returns all signatures matching the given types and arity
 * @param definition
 * @param types
 */
export function getMatchingSignatures(
  signatures: Signature[],
  givenTypes: Array<SupportedDataType | 'unknown'>,
  // a boolean array indicating which args are literals
  literalMask: boolean[],
  acceptUnknown: boolean
): Signature[] {
  return signatures.filter((sig) => {
    if (!matchesArity(sig, givenTypes.length)) {
      return false;
    }

    return givenTypes.every((givenType, index) => {
      // safe to assume the param is there, because we checked the length above
      const expectedType = unwrapArrayOneLevel(getParamAtPosition(sig, index)!.type);
      return argMatchesParamType(givenType, expectedType, literalMask[index], acceptUnknown);
    });
  });
}

/**
 * Checks if the given type matches the expected parameter type
 *
 * @param givenType
 * @param expectedType
 * @param givenIsLiteral
 */
function argMatchesParamType(
  givenType: SupportedDataType | 'unknown',
  expectedType: FunctionParameterType,
  givenIsLiteral: boolean,
  acceptUnknown: boolean
): boolean {
  if (
    givenType === expectedType ||
    expectedType === 'any' ||
    givenType === 'param' ||
    // all ES|QL functions accept null, but this is not reflected
    // in our function definitions so we let it through here
    givenType === 'null' ||
    // all functions accept keywords for text parameters
    bothStringTypes(givenType, expectedType)
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
 * Checks if both types are string types.
 *
 * Functions in ES|QL accept `text` and `keyword` types interchangeably.
 * @param type1
 * @param type2
 * @returns
 */
function bothStringTypes(type1: string, type2: string): boolean {
  return (type1 === 'text' || type1 === 'keyword') && (type2 === 'text' || type2 === 'keyword');
}

/**
 * Given an array type for example `string[]` it will return `string`
 */
function unwrapArrayOneLevel(type: FunctionParameterType): FunctionParameterType {
  return isArrayType(type) ? (type.slice(0, -2) as FunctionParameterType) : type;
}

function matchesArity(signature: FunctionDefinition['signatures'][number], arity: number): boolean {
  if (signature.minParams) {
    return arity >= signature.minParams;
  }
  return (
    arity >= signature.params.filter(({ optional }) => !optional).length &&
    arity <= signature.params.length
  );
}

/**
 * Given a function signature, returns the parameter at the given position.
 *
 * Takes into account variadic functions (minParams), returning the last
 * parameter if the position is greater than the number of parameters.
 *
 * @param signature
 * @param position
 * @returns
 */
function getParamAtPosition(
  { params, minParams }: FunctionDefinition['signatures'][number],
  position: number
) {
  return params.length > position ? params[position] : minParams ? params[params.length - 1] : null;
}

// #endregion signature matching

// #region expression completeness

/**
 * Builds a regex that matches partial strings starting
 * from the beginning of the string.
 *
 * Example:
 * "is null" -> /^i(?:s(?:\s+(?:n(?:u(?:l(?:l)?)?)?)?)?)?$/i
 */
export function buildPartialMatcher(str: string) {
  // Split the string into characters
  const chars = str.split('');

  // Initialize the regex pattern
  let pattern = '';

  // Iterate through the characters and build the pattern
  chars.forEach((char, index) => {
    if (char === ' ') {
      pattern += '\\s+';
    } else {
      pattern += char;
    }
    if (index < chars.length - 1) {
      pattern += '(?:';
    }
  });

  // Close the non-capturing groups
  for (let i = 0; i < chars.length - 1; i++) {
    pattern += ')?';
  }

  // Return the final regex pattern
  return pattern;
}

const isNullMatcher = new RegExp('is ' + buildPartialMatcher('nul') + '$', 'i');
const isNotNullMatcher = new RegExp('is ' + buildPartialMatcher('not nul') + '$', 'i');

// --- Expression types helpers ---

/**
 * Checks whether an expression is truly complete.
 *
 * (Encapsulates handling of the "is null" and "is not null"
 * checks)
 *
 * @todo use the simpler "getExpressionType(root) !== 'unknown'"
 * as soon as https://github.com/elastic/kibana/issues/199401 is resolved
 */
export function isExpressionComplete(
  expressionType: SupportedDataType | 'unknown',
  innerText: string
) {
  return (
    expressionType !== 'unknown' &&
    // see https://github.com/elastic/kibana/issues/199401
    // for the reason we need this string check.
    !(isNullMatcher.test(innerText) || isNotNullMatcher.test(innerText))
  );
}

// #endregion expression completeness
