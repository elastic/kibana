/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAssignment, isFunctionExpression } from '../../../../ast/is';

import type { ESQLAstAllCommands, ESQLAstItem, ESQLFunction } from '../../../../types';
import type { FunctionParameterType } from '../../types';
import { FunctionDefinitionTypes } from '../../types';
import { getFunctionDefinition } from '../functions';

function checkContentPerDefinition(fn: ESQLFunction, def: FunctionDefinitionTypes): boolean {
  const fnDef = getFunctionDefinition(fn.name);
  return (
    (!!fnDef && fnDef.type === def) ||
    extractFunctionArgs(fn.args).some((arg) => checkContentPerDefinition(arg, def))
  );
}

export function isAggFunctionUsedAlready(command: ESQLAstAllCommands, argIndex: number) {
  if (argIndex < 0) {
    return false;
  }
  const arg = command.args[argIndex];
  return isFunctionExpression(arg)
    ? checkContentPerDefinition(arg, FunctionDefinitionTypes.AGG)
    : false;
}

export function isTimeseriesAggUsedAlready(command: ESQLAstAllCommands, argIndex: number) {
  if (argIndex < 0) {
    return false;
  }
  const arg = command.args[argIndex];
  return isFunctionExpression(arg)
    ? checkContentPerDefinition(arg, FunctionDefinitionTypes.TIME_SERIES_AGG)
    : false;
}

function extractFunctionArgs(args: ESQLAstItem[]): ESQLFunction[] {
  return args
    .flatMap((arg) => (isAssignment(arg) ? arg.args[1] : arg))
    .filter(isFunctionExpression);
}

function getFnContent(fn: ESQLFunction): string[] {
  return [fn.name].concat(extractFunctionArgs(fn.args).flatMap(getFnContent));
}

export function getFunctionsToIgnoreForStats(command: ESQLAstAllCommands, argIndex: number) {
  if (argIndex < 0) {
    return [];
  }
  const arg = command.args[argIndex];
  return isFunctionExpression(arg) ? getFnContent(arg) : [];
}

export function ensureKeywordAndText(types: FunctionParameterType[]) {
  const result = [...types];

  if (result.includes('keyword') && !result.includes('text')) {
    result.push('text');
  }

  if (result.includes('text') && !result.includes('keyword')) {
    result.push('keyword');
  }

  return result;
}
