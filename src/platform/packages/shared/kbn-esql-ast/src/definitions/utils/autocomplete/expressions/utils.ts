/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { nullCheckOperators, inOperators } from '../../../all_operators';
import type { ExpressionContext } from './types';
import type { GetColumnsByTypeFn } from '../../../../commands_registry/types';
import { FunctionDefinitionTypes } from '../../../types';

export type SpecialFunctionName = 'case' | 'count' | 'bucket';

/** IN, NOT IN, IS NULL, IS NOT NULL operators requiring special autocomplete handling */
export const specialOperators = [...inOperators, ...nullCheckOperators];

/** Checks if operator is a NULL check (IS NULL, IS NOT NULL) */
export function isNullCheckOperator(name: string) {
  const upperName = name.toUpperCase();

  return nullCheckOperators.some((op) => op.name.toUpperCase() === upperName);
}

/** Checks if operator is IN or NOT IN */
export function isInOperator(name: string) {
  const lowerName = name.toLowerCase();

  return lowerName === 'in' || lowerName === 'not in';
}

/** Checks if operator requires special handling */
export function isSpecialOperator(name: string) {
  const lowerName = name.toLowerCase();

  return specialOperators.some((op) => op.name.toLowerCase() === lowerName);
}

/** Checks if function name matches a special function (case-insensitive) */
export function matchesSpecialFunction(name: string, expected: SpecialFunctionName) {
  return name.toLowerCase() === expected;
}

/** Determines whether a comma should be appended after accepting a suggestion */
export function shouldAddCommaAfterParam(
  hasMoreMandatoryArgs: boolean | undefined,
  functionType: FunctionDefinitionTypes,
  options: {
    isCursorFollowedByComma?: boolean;
    isBooleanCondition?: boolean;
    isCaseWithEmptyParams?: boolean;
  } = {}
): boolean {
  const {
    isCursorFollowedByComma = false,
    isBooleanCondition = false,
    isCaseWithEmptyParams = false,
  } = options;

  return (
    Boolean(hasMoreMandatoryArgs) &&
    functionType !== FunctionDefinitionTypes.OPERATOR &&
    !isCursorFollowedByComma &&
    !isBooleanCondition &&
    !isCaseWithEmptyParams
  );
}

/** Retrieves columns by type from context callbacks */
export function getColumnsByTypeFromCtx(
  ctx: ExpressionContext,
  types: any,
  ignored: string[] = [],
  opts: any = {}
) {
  const getter = ctx.callbacks?.getByType as GetColumnsByTypeFn | undefined;

  if (!getter) {
    return Promise.resolve([]);
  }

  return getter(types, ignored, opts);
}

/** Retrieves license checker from context callbacks */
export function getLicenseCheckerFromCtx(ctx: ExpressionContext) {
  return ctx.callbacks?.hasMinimumLicenseRequired;
}

/** Retrieves active product from context */
export function getActiveProductFromCtx(ctx: ExpressionContext) {
  return ctx.context?.activeProduct;
}

/** Retrieves command name from context */
export function getCommandNameFromCtx(ctx: ExpressionContext): string {
  return ctx.command.name;
}

/** Retrieves function parameter context from options */
export function getFunctionParamContextFromCtx(ctx: ExpressionContext) {
  return ctx.options.functionParameterContext;
}

/** Checks if cursor is followed by comma */
export function isCursorFollowedByCommaFromCtx(ctx: ExpressionContext): boolean {
  return ctx.options.isCursorFollowedByComma ?? false;
}
