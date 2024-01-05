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
  isColumnItem,
  getLastCharFromTrimmed,
  getFunctionDefinition,
  isSourceItem,
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

function findOption(nodes: ESQLAstItem[], offset: number): ESQLCommandOption | undefined {
  // this is a similar logic to the findNode, but it check if the command is in root or option scope
  for (const node of nodes) {
    if (!Array.isArray(node) && isOptionItem(node)) {
      if (
        (node.location.min <= offset && node.location.max >= offset) ||
        (nodes[nodes.length - 1] === node && node.location.max < offset)
      ) {
        return node;
      }
    }
  }
}

function isMarkerNode(node: ESQLSingleAstItem | undefined): boolean {
  return Boolean(
    node && (isColumnItem(node) || isSourceItem(node)) && node.name.endsWith(EDITOR_MARKER)
  );
}

function cleanMarkerNode(node: ESQLSingleAstItem | undefined): ESQLSingleAstItem | undefined {
  return isMarkerNode(node) ? undefined : node;
}

function isNotMarkerNodeOrArray(arg: ESQLAstItem) {
  return Array.isArray(arg) || !isMarkerNode(arg);
}

function mapToNonMarkerNode(arg: ESQLAstItem): ESQLAstItem {
  return Array.isArray(arg) ? arg.filter(isNotMarkerNodeOrArray).map(mapToNonMarkerNode) : arg;
}

export function removeMarkerArgFromArgsList<T extends ESQLSingleAstItem | ESQLCommand>(
  node: T | undefined
) {
  if (!node) {
    return;
  }
  if (node.type === 'command' || node.type === 'option' || node.type === 'function') {
    return {
      ...node,
      args: node.args.filter(isNotMarkerNodeOrArray).map(mapToNonMarkerNode),
    };
  }
  return node;
}

function findAstPosition(ast: ESQLAst, offset: number) {
  const command = findCommand(ast, offset);
  if (!command) {
    return { command: undefined, node: undefined, option: undefined };
  }
  return {
    command: removeMarkerArgFromArgsList(command)!,
    option: removeMarkerArgFromArgsList(findOption(command.args, offset)),
    node: removeMarkerArgFromArgsList(cleanMarkerNode(findNode(command.args, offset))),
  };
}

function isNotEnrichClauseAssigment(node: ESQLFunction, command: ESQLCommand) {
  return node.name !== '=' && command.name !== 'enrich';
}
function isBuiltinFunction(node: ESQLFunction) {
  return Boolean(getFunctionDefinition(node.name)?.builtin);
}

export function getAstContext(innerText: string, ast: ESQLAst, offset: number) {
  const { command, option, node } = findAstPosition(ast, offset);
  if (node) {
    if (node.type === 'function') {
      if (['in', 'not_in'].includes(node.name)) {
        // command ... a in ( <here> )
        return { type: 'list' as const, command, node, option };
      }
      if (isNotEnrichClauseAssigment(node, command) && !isBuiltinFunction(node)) {
        // command ... fn( <here> )
        return { type: 'function' as const, command, node, option };
      }
    }
    if (node.type === 'option' || option) {
      // command ... by <here>
      return { type: 'option' as const, command, node, option };
    }
  }

  if (!command || (innerText.length <= offset && getLastCharFromTrimmed(innerText) === '|')) {
    //   // ... | <here>
    return { type: 'newCommand' as const, command: undefined, node, option };
  }

  if (command && command.args.length) {
    if (option) {
      return { type: 'option' as const, command, node, option };
    }
  }

  // command a ... <here> OR command a = ... <here>
  return {
    type: 'expression' as const,
    command,
    option,
    node,
  };
}
