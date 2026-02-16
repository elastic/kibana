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
} from '../../../ast/is';
import type { ESQLAstItem, ESQLFunction, ESQLSingleAstItem } from '../../../types';
import { lastItem } from '../../../ast/visitor/utils';
import type {
  FunctionDefinition,
  FunctionParameterType,
  InlineCastingType,
  PromQLFunctionParamType,
  Signature,
  SupportedDataType,
} from '../types';
import { getFunctionDefinition, getFunctionForInlineCast } from './functions';
import { isArrayType } from '../types';
import { getColumnForASTNode } from './shared';
import type { ESQLColumnData } from '../../registry/types';
import { UnmappedFieldsStrategy } from '../../registry/types';
import { TIME_SYSTEM_PARAMS } from './literals';
import { isMarkerNode } from './ast';
import { getUnmappedFieldType } from './settings';
import { getPromqlFunctionDefinition } from './promql';
import type { PromQLAstExpression } from '../../../embedded_languages/promql/types';

// #region type detection

/**
 * Determines the type of the expression
 * @param root The root AST node of the expression
 * @param columns Optional map of available columns to resolve column types
 * @param unmappedFieldsStrategy Strategy to handle unmapped fields, it's only relevant if columns maps is provided
 * @returns The determined type or 'unknown' if it cannot be determined
 */
export function getExpressionType(
  root: ESQLAstItem | undefined,
  columns?: Map<string, ESQLColumnData>,
  unmappedFieldsStrategy: UnmappedFieldsStrategy = UnmappedFieldsStrategy.FAIL
): SupportedDataType | 'unknown' {
  if (!root) {
    return 'unknown';
  }

  if (Array.isArray(root)) {
    if (root.length === 0) {
      return 'unknown';
    }
    return getExpressionType(root[0], columns, unmappedFieldsStrategy);
  }

  if (isLiteral(root)) {
    if (root.literalType === 'param' && TIME_SYSTEM_PARAMS.includes(root.text)) {
      return 'keyword';
    }
    return root.literalType;
  }

  if (isInlineCast(root)) {
    const castFunction = getFunctionForInlineCast(root.castType as InlineCastingType);
    if (!castFunction) {
      return 'unknown';
    }

    const fnDef = getFunctionDefinition(castFunction);
    if (!fnDef) {
      return 'unknown';
    }

    // Safe to get the first one as all cast functions have a single return type
    return fnDef.signatures[0].returnType;
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
      return getUnmappedFieldType(unmappedFieldsStrategy);
    }
    if ('hasConflict' in column && column.hasConflict) {
      return 'unknown';
    }
    return column.type;
  }

  if (root.type === 'list') {
    return getExpressionType(root.values[0], columns, unmappedFieldsStrategy);
  }

  if (root.type === 'map') {
    return 'function_named_parameters';
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
      return getExpressionType(root.args[root.args.length - 1], columns, unmappedFieldsStrategy);
    }

    const argTypes = root.args.map((arg) =>
      getExpressionType(arg, columns, unmappedFieldsStrategy)
    );
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

// ES implicitly casts string literal arguments to these types when passed to functions that expect these types
// e.g. EXPECTS_DATE('2020-01-01') is valid because the string literal is implicitly cast to a date
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
  acceptUnknown: boolean,
  acceptPartialMatches: boolean = false
): Signature[] {
  return signatures.filter((sig) => {
    if (sig.isSignatureRepeating && !areRepeatingValueTypesConsistent(givenTypes)) {
      return false;
    }

    if (!acceptPartialMatches && !matchesArity(sig, givenTypes.length)) {
      return false;
    }

    return givenTypes.every((givenType, index) => {
      let param;
      const totalArgs = givenTypes.length;
      // Default is the last argument when total args is odd (e.g. CASE(cond, val, default))
      const isDefault = sig.isSignatureRepeating && totalArgs % 2 === 1 && index === totalArgs - 1;

      if (sig.isSignatureRepeating && sig.params.length > 0 && index >= sig.params.length) {
        if (isDefault) {
          param = sig.params[1];
        } else {
          const paramIndex = index % sig.params.length;
          param = sig.params[paramIndex];
        }
      } else {
        param = getParamAtPosition(sig, index);
      }

      if (!param) {
        return false;
      }

      const expectedType = unwrapArrayOneLevel(param.type);
      // Bypass PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING for boolean conditions
      // Default position is not a condition even though index % 2 === 0
      const isConditionPosition = sig.isSignatureRepeating && index % 2 === 0 && !isDefault;
      const effectiveIsLiteral =
        isConditionPosition && expectedType === 'boolean' ? false : literalMask[index];

      return argMatchesParamType(givenType, expectedType, effectiveIsLiteral, acceptUnknown);
    });
  });
}

/**
 * Checks if all value positions in repeating signatures have compatible types.
 * Values: odd positions (1, 3, 5...) + default (last if odd total).
 */
function areRepeatingValueTypesConsistent(
  givenTypes: Array<SupportedDataType | 'unknown'>
): boolean {
  const { length } = givenTypes;
  const isValue = (i: number) => i % 2 === 1 || (length % 2 === 1 && i === length - 1);
  const valueTypes = givenTypes.filter((_, i) => isValue(i));
  const [first, ...rest] = valueTypes;

  if (!first || first === 'unknown' || first === 'param') {
    return true;
  }

  return rest.every(
    (type) =>
      type === 'unknown' ||
      type === 'param' ||
      type === first ||
      bothStringTypes(first, type) ||
      (first === 'long' && type === 'integer')
  );
}

/**
 * Checks if the given type matches the expected parameter type
 *
 * @param givenType
 * @param expectedType
 * @param givenIsLiteral
 */
export function argMatchesParamType(
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
    // Check array types
    givenType === unwrapArrayOneLevel(expectedType) ||
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
export function getParamAtPosition(
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

// Handles: "IS ", "IS N", "IS NU", "IS NUL" with flexible whitespace
const isNullMatcher = new RegExp('is\\s*(' + buildPartialMatcher('nul') + ')?$', 'i');
const isNotNullMatcher = new RegExp('is\\s*(' + buildPartialMatcher('not nul') + ')?$', 'i');

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
  if (expressionType === 'unknown') {
    return false;
  }

  // Check for incomplete IS NULL / IS NOT NULL
  if (isNullMatcher.test(innerText) || isNotNullMatcher.test(innerText)) {
    return false;
  }

  return true;
}

// #endregion expression completeness

/**
 * Returns the left or right operand of a binary expression function.
 */
export function getBinaryExpressionOperand(
  binaryExpression: ESQLFunction,
  side: 'left' | 'right'
): ESQLSingleAstItem | ESQLSingleAstItem[] | undefined {
  const left = binaryExpression.args[0] as ESQLSingleAstItem | ESQLSingleAstItem[] | undefined;
  const right = binaryExpression.args[1] as ESQLSingleAstItem | ESQLSingleAstItem[] | undefined;

  return side === 'left' ? left : right;
}

/**
 * Extracts a valid expression root from an assignment, handling arrays and marker nodes.
 */
export function getAssignmentExpressionRoot(
  assignment: ESQLFunction
): ESQLSingleAstItem | undefined {
  const rhs = getBinaryExpressionOperand(assignment, 'right');
  const root = Array.isArray(rhs) ? rhs[0] : rhs;

  if (!root || isMarkerNode(root)) {
    return undefined;
  }

  return root;
}

export function getPromqlExpressionType(
  expression: PromQLAstExpression
): PromQLFunctionParamType | undefined {
  switch (expression.type) {
    case 'selector':
      return expression.duration ? 'range_vector' : 'instant_vector';
    case 'subquery':
      return 'range_vector';
    case 'literal':
      return expression.literalType === 'string' ? 'string' : 'scalar';
    case 'parens':
      return getPromqlExpressionType(expression.child);
    case 'unary-expression':
      return getPromqlExpressionType(expression.arg);
    case 'function':
      return getPromqlFunctionDefinition(expression.name)?.signatures[0]?.returnType;
    case 'binary-expression': {
      const bothScalar =
        getPromqlExpressionType(expression.left) === 'scalar' &&
        getPromqlExpressionType(expression.right) === 'scalar';

      return bothScalar ? 'scalar' : 'instant_vector';
    }
  }
}
