/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../commands_registry/types';
import type { ESQLAstItem, ESQLFunction, ESQLSingleAstItem } from '../../../../../types';
import { getFunctionDefinition } from '../../../functions';
import {
  getValidSignaturesAndTypesToSuggestNext,
  type FunctionParameterContext,
} from '../../helpers';
import type { ExpressionContext } from '../context';
import { suggestForExpression } from '../suggestForExpression';

/**
 * Handles suggestions when cursor is inside a function call (between parentheses)
 *
 * This handler is called when position is 'in_function', meaning the cursor is
 * positioned within the arguments of a variadic function call like:
 * - CONCAT(field1, /)
 * - BUCKET(longField, /)
 * - CASE(condition1, /)
 *
 * The handler recursively calls suggestForExpression for the current parameter
 * being edited, inheriting and extending the function parameter context.
 */
export async function handleInFunction({
  expressionRoot,
  context,
  options,
  innerText,
  query,
  command,
  cursorPosition,
  location,
  callbacks,
}: ExpressionContext): Promise<ISuggestionItem[]> {
  const functionExpression = expressionRoot as ESQLFunction;
  const functionDefinition = getFunctionDefinition(functionExpression.name);

  if (!functionDefinition || !context) {
    return [];
  }

  const validationResult = getValidSignaturesAndTypesToSuggestNext(
    functionExpression,
    context,
    functionDefinition
  );

  const paramContext = buildFunctionParameterContext(
    validationResult,
    functionExpression.name,
    functionDefinition,
    options.functionParameterContext
  );

  const targetExpression = determineTargetExpression(functionExpression, innerText);

  return suggestForExpression({
    query,
    command,
    cursorPosition,
    location,
    context,
    callbacks,
    expressionRoot: targetExpression,
    options: {
      ...options,
      functionParameterContext: paramContext,
    },
  });
}

function buildFunctionParameterContext(
  validationResult: ReturnType<typeof getValidSignaturesAndTypesToSuggestNext>,
  functionName: string,
  functionDefinition: ReturnType<typeof getFunctionDefinition>,
  existingContext?: FunctionParameterContext
): FunctionParameterContext {
  const existingIgnored = existingContext?.functionsToIgnore || [];
  const functionsToIgnore = existingIgnored.includes(functionName)
    ? existingIgnored
    : [...existingIgnored, functionName];

  return {
    paramDefinitions: validationResult.compatibleParamDefs,
    functionsToIgnore,
    hasMoreMandatoryArgs: validationResult.hasMoreMandatoryArgs,
    functionDefinition,
  };
}

function determineTargetExpression(
  functionExpression: ESQLFunction,
  innerText: string
): ESQLSingleAstItem | undefined {
  const args = functionExpression.args;
  const startingNewParam = /,\s*$/.test(innerText);
  const firstArgEmpty = isFirstArgumentEmpty(args, innerText);

  if (startingNewParam || firstArgEmpty) {
    return undefined;
  }

  const lastArg = args[args.length - 1] as ESQLAstItem;

  return (Array.isArray(lastArg) ? lastArg[0] : lastArg) as ESQLSingleAstItem;
}

function isFirstArgumentEmpty(args: ESQLFunction['args'], innerText: string): boolean {
  if (args.length === 0 || !args[0]) {
    return false;
  }

  const firstArgIsEmpty = Array.isArray(args[0]) ? args[0].length === 0 : !args[0];

  return firstArgIsEmpty && innerText.trimEnd().endsWith('(');
}
