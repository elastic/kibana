/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  isLiteral,
  isTimeInterval,
  isInlineCast,
  isColumn,
  isParamLiteral,
  isFunctionExpression,
} from '../../ast/is';
import type { ESQLAstItem, ESQLFunction } from '../../types';
import type { ESQLFieldWithMetadata, ESQLUserDefinedColumn } from '../../commands_registry/types';
import type { SupportedDataType, FunctionDefinition } from '../types';
import { lastItem } from '../../visitor/utils';
import { getFunctionDefinition } from './functions';
import { getColumnForASTNode, isParamExpressionType } from './shared';

/**
 * Gets the signatures of a function that match the number of arguments
 * provided in the AST.
 */
export function getSignaturesWithMatchingArity(
  fnDef: FunctionDefinition,
  astFunction: ESQLFunction
) {
  return fnDef.signatures.filter((def) => {
    if (def.minParams) {
      return astFunction.args.length >= def.minParams;
    }
    return (
      astFunction.args.length >= def.params.filter(({ optional }) => !optional).length &&
      astFunction.args.length <= def.params.length
    );
  });
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
  return new RegExp(pattern + '$', 'i');
}

const isNullMatcher = buildPartialMatcher('is nul');
const isNotNullMatcher = buildPartialMatcher('is not nul');

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

/**
 * Determines the type of the expression
 */
export function getExpressionType(
  root: ESQLAstItem | undefined,
  fields?: Map<string, ESQLFieldWithMetadata>,
  userDefinedColumns?: Map<string, ESQLUserDefinedColumn[]>
): SupportedDataType | 'unknown' {
  if (!root) {
    return 'unknown';
  }

  if (Array.isArray(root)) {
    if (root.length === 0) {
      return 'unknown';
    }
    return getExpressionType(root[0], fields, userDefinedColumns);
  }

  if (isLiteral(root)) {
    return root.literalType;
  }

  if (isTimeInterval(root)) {
    return 'time_duration';
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

  if (isColumn(root) && fields && userDefinedColumns) {
    const column = getColumnForASTNode(root, { fields, userDefinedColumns });
    const lastArg = lastItem(root.args);
    // If the last argument is a param, we return its type (param literal type)
    // This is useful for cases like `where ??field`
    if (isParamLiteral(lastArg)) {
      return lastArg.literalType;
    }
    if (!column) {
      return 'unknown';
    }
    return column.type;
  }

  if (root.type === 'list') {
    return getExpressionType(root.values[0], fields, userDefinedColumns);
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
      return getExpressionType(root.args[root.args.length - 1], fields, userDefinedColumns);
    }

    const signaturesWithCorrectArity = getSignaturesWithMatchingArity(fnDefinition, root);

    if (!signaturesWithCorrectArity.length) {
      return 'unknown';
    }
    const argTypes = root.args.map((arg) => getExpressionType(arg, fields, userDefinedColumns));

    // When functions are passed null for any argument, they generally return null
    // This is a special case that is not reflected in our function definitions
    if (argTypes.some((argType) => argType === 'null')) return 'null';

    const matchingSignature = signaturesWithCorrectArity.find((signature) => {
      return argTypes.every((argType, i) => {
        const param = getParamAtPosition(signature, i);
        return (
          param &&
          (param.type === 'any' ||
            param.type === argType ||
            (argType === 'keyword' && ['date', 'date_period'].includes(param.type)) ||
            isParamExpressionType(argType))
        );
      });
    });

    if (!matchingSignature) {
      return 'unknown';
    }

    return matchingSignature.returnType === 'any' ? 'unknown' : matchingSignature.returnType;
  }

  return 'unknown';
}
