/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { suggestForExpression } from '../suggestionEngine';
import type { ExpressionContext, FunctionParameterContext } from '../types';
import { getValidSignaturesAndTypesToSuggestNext } from '../../helpers';
import { getFunctionDefinition } from '../../../functions';
import type { ISuggestionItem } from '../../../../../commands_registry/types';
import type { ESQLAstItem, ESQLFunction, ESQLSingleAstItem } from '../../../../../types';

/** Matches comma followed by optional whitespace at end of text */
const STARTING_NEW_PARAM_REGEX = /,\s*$/;

/** Suggests completions when cursor is inside a function call (e.g., CONCAT(field1, /)) */
export async function suggestInFunction(ctx: ExpressionContext): Promise<ISuggestionItem[]> {
  const {
    expressionRoot,
    context,
    options,
    innerText,
    query,
    command,
    cursorPosition,
    location,
    callbacks,
  } = ctx;

  const functionExpression = expressionRoot as ESQLFunction;
  const functionDefinition = getFunctionDefinition(functionExpression.name);

  if (!functionDefinition || !context) {
    return [];
  }

  const validSignatures = getValidSignaturesAndTypesToSuggestNext(
    functionExpression,
    context,
    functionDefinition
  );

  const paramContext = buildInFunctionParameterContext(
    validSignatures,
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

/** Builds function parameter context, adding current function to ignore list */
function buildInFunctionParameterContext(
  validationResult: ReturnType<typeof getValidSignaturesAndTypesToSuggestNext>,
  functionName: string,
  functionDefinition: ReturnType<typeof getFunctionDefinition>,
  existingContext?: FunctionParameterContext
): FunctionParameterContext {
  const existingIgnored = existingContext?.functionsToIgnore || [];
  const functionsToIgnore = existingIgnored.includes(functionName)
    ? existingIgnored
    : [...existingIgnored, functionName];

  const firstArgumentType = validationResult.enrichedArgs[0]?.dataType;

  return {
    paramDefinitions: validationResult.compatibleParamDefs,
    functionsToIgnore,
    hasMoreMandatoryArgs: validationResult.hasMoreMandatoryArgs,
    functionDefinition,
    firstArgumentType,
    currentParameterIndex: validationResult.argIndex,
  };
}

/** Determines which expression to use as target for recursive suggestion */
function determineTargetExpression(
  functionExpression: ESQLFunction,
  innerText: string
): ESQLSingleAstItem | undefined {
  const { args } = functionExpression;
  const startingNewParam = STARTING_NEW_PARAM_REGEX.test(innerText);
  const firstArgEmpty = isFirstArgumentEmpty(args, innerText);

  if (startingNewParam || firstArgEmpty) {
    return undefined;
  }

  const lastArg = args[args.length - 1] as ESQLAstItem;

  return (Array.isArray(lastArg) ? lastArg[0] : lastArg) as ESQLSingleAstItem;
}

/** Checks if cursor is immediately after opening parenthesis with no argument */
function isFirstArgumentEmpty(args: ESQLFunction['args'], innerText: string): boolean {
  if (args.length === 0 || !args[0]) {
    return false;
  }

  const firstArgIsEmpty = Array.isArray(args[0]) ? args[0].length === 0 : !args[0];

  return firstArgIsEmpty && innerText.trimEnd().endsWith('(');
}
