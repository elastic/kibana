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
  Walker,
  isIdentifier,
  ESQLCommandOption,
  ESQLCommandMode,
} from '@kbn/esql-ast';
import { FunctionDefinitionTypes } from '../definitions/types';
import { EDITOR_MARKER } from './constants';
import {
  isColumnItem,
  isSourceItem,
  pipePrecedesCurrentWord,
  getFunctionDefinition,
  isOptionItem,
  within,
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

export function isMarkerNode(node: ESQLAstItem | undefined): boolean {
  if (Array.isArray(node)) {
    return false;
  }

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
    return { command: undefined, node: undefined };
  }

  const containingFunction = Walker.findAll(
    command,
    (node) =>
      node.type === 'function' && node.subtype === 'variadic-call' && within(offset, node.location)
  ).pop() as ESQLFunction | undefined;

  return {
    command: removeMarkerArgFromArgsList(command)!,
    containingFunction: removeMarkerArgFromArgsList(containingFunction),
    option: removeMarkerArgFromArgsList(findOption(command.args, offset)),
    node: removeMarkerArgFromArgsList(cleanMarkerNode(findNode(command.args, offset))),
  };
}

function isNotEnrichClauseAssigment(node: ESQLFunction, command: ESQLCommand) {
  return node.name !== '=' && command.name !== 'enrich';
}

function isOperator(node: ESQLFunction) {
  return getFunctionDefinition(node.name)?.type === FunctionDefinitionTypes.OPERATOR;
}

/**
 * Given a ES|QL query string, its AST and the cursor position,
 * it returns the type of context for the position ("list", "function", "option", "setting", "expression", "newCommand")
 * plus the whole hierarchy of nodes (command, option, setting and actual position node) context.
 *
 * Type details:
 * * "list": the cursor is inside a "in" list of values (i.e. `a in (1, 2, <here>)`)
 * * "function": the cursor is inside a function call (i.e. `fn(<here>)`)
 * * "expression": the cursor is inside a command expression (i.e. `command ... <here>` or `command a = ... <here>`)
 * * "newCommand": the cursor is at the beginning of a new command (i.e. `command1 | command2 | <here>`)
 */
export function getAstContext(queryString: string, ast: ESQLAst, offset: number) {
  let inComment = false;

  Walker.visitComments(ast, (node) => {
    if (within(offset, node.location)) {
      inComment = true;
    }
  });

  if (inComment) {
    return {
      type: 'comment' as const,
    };
  }

  let withinStatsWhereClause = false;
  Walker.walk(ast, {
    visitFunction: (fn) => {
      if (fn.name === 'where' && within(offset, fn.location)) {
        withinStatsWhereClause = true;
      }
    },
  });

  const { command, option, node, containingFunction } = findAstPosition(ast, offset);
  if (node) {
    if (node.type === 'literal' && node.literalType === 'keyword') {
      // command ... "<here>"
      return { type: 'value' as const, command, node, option, containingFunction };
    }

    if (node.type === 'function') {
      if (['in', 'not_in'].includes(node.name) && Array.isArray(node.args[1])) {
        // command ... a in ( <here> )
        return { type: 'list' as const, command, node, option, containingFunction };
      }
      if (
        isNotEnrichClauseAssigment(node, command) &&
        (!isOperator(node) || (command.name === 'stats' && !withinStatsWhereClause))
      ) {
        // command ... fn( <here> )
        return { type: 'function' as const, command, node, option, containingFunction };
      }
    }
  }
  if (
    !command ||
    (queryString.length <= offset &&
      pipePrecedesCurrentWord(queryString) &&
      command.location.max < queryString.length)
  ) {
    //   // ... | <here>
    return { type: 'newCommand' as const, command: undefined, node, option, containingFunction };
  }

  // command a ... <here> OR command a = ... <here>
  return {
    type: 'expression' as const,
    command,
    containingFunction,
    option,
    node,
  };
}
