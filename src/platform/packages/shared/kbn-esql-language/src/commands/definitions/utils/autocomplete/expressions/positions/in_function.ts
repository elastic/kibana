/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { suggestForExpression } from '../suggestion_engine';
import type { ExpressionContext, FunctionParameterContext } from '../types';
import { getFunctionDefinition } from '../../../functions';
import type { ISuggestionItem } from '../../../../../registry/types';
import type { ESQLFunction, ESQLSingleAstItem } from '../../../../../../types';
import { SignatureAnalyzer } from '../signature_analyzer';
import { within } from '../../../../../../ast/location';

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

  const analyzer = SignatureAnalyzer.fromNode(functionExpression, context, functionDefinition);

  if (!analyzer) {
    return [];
  }

  const paramContext = buildInFunctionParameterContext(analyzer, functionDefinition);
  const targetExpression = determineTargetExpression(functionExpression, innerText);

  const existing = options.parentFunctionNames ?? [];
  const parentFunctionNames = existing.includes(functionExpression.name)
    ? existing
    : [...existing, functionExpression.name];

  const { suggestions } = await suggestForExpression({
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
      parentFunctionNames,
    },
  });

  return suggestions;
}

function buildInFunctionParameterContext(
  analyzer: SignatureAnalyzer,
  functionDefinition: ReturnType<typeof getFunctionDefinition>
): FunctionParameterContext {
  return {
    paramDefinitions: analyzer.getCompatibleParamDefs(),
    hasMoreMandatoryArgs: analyzer.getHasMoreMandatoryArgs(),
    functionDefinition,
    firstArgumentType: analyzer.getFirstArgumentType(),
    firstValueType: analyzer.getFirstValueType(),
    currentParameterIndex: analyzer.getCurrentParameterIndex(),
    validSignatures: analyzer.getValidSignatures(),
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

  const lastArg = args[args.length - 1];
  const lastArgNode = (Array.isArray(lastArg) ? lastArg[0] : lastArg) as ESQLSingleAstItem;

  // Recurse into nested function when cursor is inside its bounds
  // Example: SCORE(MATCH_PHRASE(textField, /)) → return MATCH_PHRASE as new expressionRoot
  if (startingNewParam && lastArgNode && within(innerText.length, lastArgNode)) {
    return lastArgNode;
  }

  if (startingNewParam || firstArgEmpty) {
    return undefined;
  }

  return lastArgNode;
}

/** Checks if cursor is immediately after opening parenthesis with no argument */
function isFirstArgumentEmpty(args: ESQLFunction['args'], innerText: string): boolean {
  if (args.length === 0 || !args[0]) {
    return false;
  }

  const firstArgIsEmpty = Array.isArray(args[0]) ? args[0].length === 0 : !args[0];

  return firstArgIsEmpty && innerText.trimEnd().endsWith('(');
}
