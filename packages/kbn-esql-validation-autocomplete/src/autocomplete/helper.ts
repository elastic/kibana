/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLAstItem, ESQLCommand, ESQLFunction, ESQLSource } from '@kbn/esql-ast';
import { FunctionDefinition } from '../definitions/types';
import { EDITOR_MARKER } from '../shared/constants';
import {
  getFunctionDefinition,
  isAssignment,
  isFunctionItem,
  getLastCharFromTrimmed,
  isComma,
  isMathFunction,
} from '../shared/helpers';
import type { EditorContext } from './types';

function extractFunctionArgs(args: ESQLAstItem[]): ESQLFunction[] {
  return args.flatMap((arg) => (isAssignment(arg) ? arg.args[1] : arg)).filter(isFunctionItem);
}

function checkContent(fn: ESQLFunction): boolean {
  const fnDef = getFunctionDefinition(fn.name);
  return (!!fnDef && fnDef.type === 'agg') || extractFunctionArgs(fn.args).some(checkContent);
}

export function isAggFunctionUsedAlready(command: ESQLCommand, argIndex: number) {
  if (argIndex < 0) {
    return false;
  }
  const arg = command.args[argIndex];
  return isFunctionItem(arg) ? checkContent(arg) : false;
}

function getFnContent(fn: ESQLFunction): string[] {
  return [fn.name].concat(extractFunctionArgs(fn.args).flatMap(getFnContent));
}

export function getFunctionsToIgnoreForStats(command: ESQLCommand, argIndex: number) {
  if (argIndex < 0) {
    return [];
  }
  const arg = command.args[argIndex];
  return isFunctionItem(arg) ? getFnContent(arg) : [];
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

export function getQueryForFields(queryString: string, commands: ESQLCommand[]) {
  // If there is only one source command and it does not require fields, do not
  // fetch fields, hence return an empty string.
  return commands.length === 1 && ['from', 'row', 'show'].includes(commands[0].name)
    ? ''
    : queryString;
}

export function getSourcesFromCommands(commands: ESQLCommand[], sourceType: 'index' | 'policy') {
  const fromCommand = commands.find(({ name }) => name === 'from');
  const args = (fromCommand?.args ?? []) as ESQLSource[];
  const sources = args.filter((arg) => arg.sourceType === sourceType);

  return sources.length === 1 ? sources[0] : undefined;
}

export const findMissingBrackets = (text: string) => {
  const stack: Array<']' | ')'> = [];
  const length = text.length;
  let roundCount = 0;

  for (let i = 0; i < length; i++) {
    const char = text[i];
    switch (char) {
      case '(': {
        roundCount++;
        stack.push(')');
        break;
      }
      case '[': {
        stack.push(']');
        break;
      }
      case ')': {
        if (roundCount > 0) roundCount--;
        stack.pop();
        break;
      }
      case ']': {
        stack.pop();
        break;
      }
    }
  }

  return {
    stack,
    roundCount,
  };
};

/**
 * Tries to fix the query by: (1) inserting missing closing brackets and
 * (2) inserting a marker, if the character before the caret might imply that
 * the user is about to type a new expression.
 *
 * @param query An ES|QL query to fix.
 * @param caretPosition User's cursor position.
 * @param context Context of the editor.
 */
export const fixupQuery = (query: string, caretPosition: number, context: EditorContext) => {
  const leftOfCaret = query.substring(0, caretPosition);
  const missingBrackets = findMissingBrackets(leftOfCaret);
  let fixedQuery = leftOfCaret;

  // Insert a marker, if it is a comma/colon by the user or a forced trigger by
  // a function argument suggestion to make the expression still valid.
  const charThatNeedMarkers = [',', ':'];
  if (
    (context.triggerCharacter && charThatNeedMarkers.includes(context.triggerCharacter)) ||
    (context.triggerKind === 0 &&
      missingBrackets.roundCount === 0 &&
      getLastCharFromTrimmed(leftOfCaret) !== '_') ||
    (context.triggerCharacter === ' ' &&
      (isMathFunction(leftOfCaret, caretPosition) ||
        isComma(leftOfCaret.trimEnd()[leftOfCaret.trimEnd().length - 1])))
  ) {
    fixedQuery =
      leftOfCaret.substring(0, caretPosition) +
      EDITOR_MARKER +
      leftOfCaret.substring(caretPosition);
  }
  if (missingBrackets.stack) fixedQuery += missingBrackets.stack.join('');

  return fixedQuery;
};
