/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ESQLAstItem,
  type ESQLSingleAstItem,
  type ESQLAst,
  type ESQLFunction,
  type ESQLCommand,
  type ESQLCommandOption,
  type ESQLCommandMode,
  Walker,
  isIdentifier,
} from '@kbn/esql-ast';
import { ENRICH_MODES } from '../definitions/settings';
import { EDITOR_MARKER } from './constants';
import {
  isOptionItem,
  isColumnItem,
  isSourceItem,
  isSettingItem,
  pipePrecedesCurrentWord,
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
      if (node && node.location && node.location.min <= offset && node.location.max >= offset) {
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

export function isMarkerNode(node: ESQLSingleAstItem | undefined): boolean {
  return Boolean(
    node &&
      (isColumnItem(node) || isIdentifier(node) || isSourceItem(node)) &&
      node.name.endsWith(EDITOR_MARKER)
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

/**
 * Given a ES|QL query string, its AST and the cursor position,
 * it returns the type of context for the position ("list", "function", "option", "setting", "expression", "newCommand")
 * plus the whole hierarchy of nodes (command, option, setting and actual position node) context.
 *
 * Type details:
 * * "list": the cursor is inside a "in" list of values (i.e. `a in (1, 2, <here>)`)
 * * "function": the cursor is inside a function call (i.e. `fn(<here>)`)
 * * "option": the cursor is inside a command option (i.e. `command ... by <here>`)
 * * "setting": the cursor is inside a setting (i.e. `command _<here>`)
 * * "expression": the cursor is inside a command expression (i.e. `command ... <here>` or `command a = ... <here>`)
 * * "newCommand": the cursor is at the beginning of a new command (i.e. `command1 | command2 | <here>`)
 */
export function getAstContext(queryString: string, ast: ESQLAst, offset: number) {
  let inComment = false;

  Walker.visitComments(ast, (node) => {
    if (node.location && node.location.min <= offset && node.location.max > offset) {
      inComment = true;
    }
  });

  if (inComment) {
    return {
      type: 'comment' as const,
    };
  }

  const { command, option, setting, node } = findAstPosition(ast, offset);
  if (node) {
    if (node.type === 'literal' && node.literalType === 'keyword') {
      // command ... "<here>"
      return { type: 'value' as const, command, node, option, setting };
    }
    if (node.type === 'function') {
      if (['in', 'not_in'].includes(node.name) && Array.isArray(node.args[1])) {
        // command ... a in ( <here> )
        return { type: 'list' as const, command, node, option, setting };
      }
      if (
        isNotEnrichClauseAssigment(node, command) &&
        // Temporarily mangling the logic here to let operators
        // be handled as functions for the stats command.
        // I expect this to simplify once https://github.com/elastic/kibana/issues/195418
        // is complete
        !(isBuiltinFunction(node) && command.name !== 'stats')
      ) {
        // command ... fn( <here> )
        return { type: 'function' as const, command, node, option, setting };
      }
    }
    // for now it's only an enrich thing
    if (node.type === 'source' && node.text === ENRICH_MODES.prefix) {
      // command _<here>
      return { type: 'setting' as const, command, node, option, setting };
    }
  }
  if (!command || (queryString.length <= offset && pipePrecedesCurrentWord(queryString))) {
    //   // ... | <here>
    return { type: 'newCommand' as const, command: undefined, node, option, setting };
  }

  // TODO — remove this option branch once https://github.com/elastic/kibana/issues/195418 is complete
  if (command && isOptionItem(command.args[command.args.length - 1]) && command.name !== 'stats') {
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
