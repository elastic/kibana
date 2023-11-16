/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ESQLAstItem,
  ESQLSingleAstItem,
  ESQLAst,
  ESQLFunction,
  ESQLCommand,
  ESQLCommandOption,
} from '../types';
import { EDITOR_MARKER } from './constants';
import {
  isOptionItem,
  isFunctionItem,
  isColumnItem,
  getLastCharFromTrimmed,
  isAssignment,
  getCommandOption,
  getFunctionDefinition,
} from './helpers';

function findNode(nodes: ESQLAstItem[], offset: number): ESQLSingleAstItem | undefined {
  for (const node of nodes) {
    if (Array.isArray(node)) {
      const ret = findNode(node, offset);
      if (ret) {
        return ret;
      }
    } else {
      if (node.location.min <= offset && node.location.max >= offset) {
        if ('args' in node) {
          const ret = findNode(node.args, offset);
          // if the found node is the marker, then return its parent
          if (ret?.text === EDITOR_MARKER) {
            return node;
          }
          if (ret) {
            return ret;
          }
        }
        return node;
      }
    }
  }
}

function findCommand(ast: ESQLAst, offset: number) {
  const commandIndex = ast.findIndex(
    ({ location }) => location.min <= offset && location.max >= offset
  );
  return ast[commandIndex] || ast[ast.length - 1];
}

function findAstPosition(ast: ESQLAst, offset: number) {
  const command = findCommand(ast, offset);
  if (!command) {
    return { command: undefined, node: undefined };
  }
  const node = findNode(command.args, offset);
  return { command, node };
}

function isNotEnrichClauseAssigment(node: ESQLFunction, command: ESQLCommand) {
  return node.name !== '=' && command.name !== 'enrich';
}
function isNotLastFunctionStats(node: ESQLFunction, command: ESQLCommand, offset: number) {
  return command.name === 'stats' && isAssignment(node) && offset < node.location.max;
}
function isBuiltinFunction(node: ESQLFunction) {
  return Boolean(getFunctionDefinition(node.name)?.builtin);
}

export function getAstContext(innerText: string, ast: ESQLAst, offset: number) {
  const { command, node } = findAstPosition(ast, offset);
  console.log({ ast, offset, command, node });
  if (node) {
    if (node.type === 'function') {
      console.log(
        isNotEnrichClauseAssigment(node, command),
        isNotLastFunctionStats(node, command, offset)
      );
      if (['in', 'not_in'].includes(node.name)) {
        // command ... a in ( <here> )
        return { type: 'list' as const, command, node };
      }
      if (isNotEnrichClauseAssigment(node, command) && !isBuiltinFunction(node)) {
        // command ... fn( <here> )
        return { type: 'function' as const, command, node };
      }
    }
    if (node.type === 'option') {
      // command ... by <here>
      return { type: 'option' as const, command, node };
    }
  }
  if (command && command.args.length) {
    const lastArg = command.args[command.args.length - 1];
    if (
      isOptionItem(lastArg) &&
      (lastArg.incomplete ||
        !lastArg.args.length ||
        getCommandOption(lastArg.name)?.signature.multipleParams ||
        handleEnrichWithClause(lastArg))
    ) {
      return { type: 'option' as const, command, node: lastArg };
    }
  }
  if (!command || (innerText.length <= offset && getLastCharFromTrimmed(innerText) === '|')) {
    //   // ... | <here>
    return { type: 'newCommand' as const, command: undefined, node: undefined };
  }

  // command a ... <here> OR command a = ... <here>
  return {
    type: 'expression' as const,
    command,
    // make sure to clean it up in case the found node is the marker
    node: node && isColumnItem(node) && node.name === EDITOR_MARKER ? undefined : node,
  };
}

function isEmptyValue(text: string) {
  return [EDITOR_MARKER, ''].includes(text);
}

// The enrich with clause it a bit tricky to detect, so it deserves a specific check
function handleEnrichWithClause(option: ESQLCommandOption) {
  const fnArg = isFunctionItem(option.args[0]) ? option.args[0] : undefined;
  if (fnArg) {
    if (fnArg.name === '=' && isColumnItem(fnArg.args[0]) && fnArg.args[1]) {
      const assignValue = fnArg.args[1];
      if (Array.isArray(assignValue) && isColumnItem(assignValue[0])) {
        return fnArg.args[0].name === assignValue[0].name || isEmptyValue(assignValue[0].name);
      }
    }
  }
  return false;
}
