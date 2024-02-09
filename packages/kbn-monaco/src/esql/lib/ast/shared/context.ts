/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { enrichModes } from '../definitions/settings';
import type {
  ESQLAstItem,
  ESQLSingleAstItem,
  ESQLAst,
  ESQLFunction,
  ESQLCommand,
  ESQLCommandOption,
  ESQLCommandMode,
} from '../types';
import { EDITOR_MARKER } from './constants';
import {
  isOptionItem,
  isColumnItem,
  getLastCharFromTrimmed,
  getFunctionDefinition,
  isSourceItem,
  isSettingItem,
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
  return findCommandSubType(nodes, offset, isOptionItem);
}

function findSetting(nodes: ESQLAstItem[], offset: number): ESQLCommandMode | undefined {
  return findCommandSubType(nodes, offset, isSettingItem);
}

function findCommandSubType<T extends ESQLCommandMode | ESQLCommandOption>(
  nodes: ESQLAstItem[],
  offset: number,
  isOfTypeFn: (node: ESQLAstItem) => node is T
): T | undefined {
  for (const node of nodes) {
    if (isOfTypeFn(node)) {
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
    return { command: undefined, node: undefined, option: undefined, setting: undefined };
  }
  return {
    command: removeMarkerArgFromArgsList(command)!,
    option: removeMarkerArgFromArgsList(findOption(command.args, offset)),
    node: removeMarkerArgFromArgsList(cleanMarkerNode(findNode(command.args, offset))),
    setting: removeMarkerArgFromArgsList(findSetting(command.args, offset)),
  };
}

function isNotEnrichClauseAssigment(node: ESQLFunction, command: ESQLCommand) {
  return node.name !== '=' && command.name !== 'enrich';
}
function isBuiltinFunction(node: ESQLFunction) {
  return getFunctionDefinition(node.name)?.type === 'builtin';
}

export function getAstContext(innerText: string, ast: ESQLAst, offset: number) {
  const { command, option, setting, node } = findAstPosition(ast, offset);
  if (node) {
    if (node.type === 'function') {
      if (['in', 'not_in'].includes(node.name) && Array.isArray(node.args[1])) {
        // command ... a in ( <here> )
        return { type: 'list' as const, command, node, option, setting };
      }
      if (isNotEnrichClauseAssigment(node, command) && !isBuiltinFunction(node)) {
        // command ... fn( <here> )
        return { type: 'function' as const, command, node, option, setting };
      }
    }
    if (node.type === 'option' || option) {
      // command ... by <here>
      return { type: 'option' as const, command, node, option, setting };
    }
    // for now it's only an enrich thing
    if (node.type === 'source' && node.text === enrichModes.prefix) {
      // command _<here>
      return { type: 'setting' as const, command, node, option, setting };
    }
  }
  if (!command && innerText.trim().toLowerCase() === 'show') {
    return {
      type: 'expression' as const,
      // The ES grammar makes the "SHOW" command an invalid type at grammar level
      // so we need to create a fake command to make it work the AST in this case
      command: {
        type: 'command',
        name: 'show',
        text: innerText.trim(),
        location: { min: 0, max: innerText.length },
        incomplete: true,
        args: [],
      } as ESQLCommand,
      node,
      option,
    };
  }

  if (!command || (innerText.length <= offset && getLastCharFromTrimmed(innerText) === '|')) {
    //   // ... | <here>
    return { type: 'newCommand' as const, command: undefined, node, option, setting };
  }

  if (command && command.args.length) {
    if (option) {
      return { type: 'option' as const, command, node, option, setting };
    }
  }

  // command a ... <here> OR command a = ... <here>
  return {
    type: 'expression' as const,
    command,
    option,
    node,
    setting,
  };
}
