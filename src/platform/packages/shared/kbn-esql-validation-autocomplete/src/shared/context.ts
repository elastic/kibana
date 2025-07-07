/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ESQLCommandOption,
  Walker,
  isIdentifier,
  isList,
  type ESQLAst,
  type ESQLAstItem,
  type ESQLCommand,
  type ESQLFunction,
  type ESQLSingleAstItem,
  FunctionDefinitionTypes,
} from '@kbn/esql-ast';
import { EDITOR_MARKER } from '@kbn/esql-ast/src/parser/constants';
import { pipePrecedesCurrentWord } from '@kbn/esql-ast/src/definitions/utils';
import { ESQLAstExpression } from '@kbn/esql-ast/src/types';
import { isColumnItem, isSourceItem, getFunctionDefinition, isOptionItem, within } from './helpers';

function findCommand(ast: ESQLAst, offset: number) {
  const commandIndex = ast.findIndex(
    ({ location }) => location.min <= offset && location.max >= offset
  );

  const command = ast[commandIndex] || ast[ast.length - 1];

  return command;
}

function findOption(nodes: ESQLAstItem[], offset: number): ESQLCommandOption | undefined {
  return findCommandSubType(nodes, offset, isOptionItem);
}

function findCommandSubType<T extends ESQLCommandOption>(
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

const removeMarkerNode = (node: ESQLAstExpression) => {
  Walker.walk(node, {
    visitAny: (current) => {
      if ('args' in current) {
        current.args = current.args.filter((n) => !isMarkerNode(n));
      } else if ('values' in current) {
        current.values = current.values.filter((n) => !isMarkerNode(n));
      }
    },
  });
};

function findAstPosition(ast: ESQLAst, offset: number) {
  const command = findCommand(ast, offset);
  if (!command) {
    return { command: undefined, node: undefined };
  }

  let containingFunction: ESQLFunction | undefined;
  let node: ESQLSingleAstItem | undefined;

  Walker.walk(command, {
    visitSource: (_node, parent, walker) => {
      if (_node.location.max >= offset && _node.text !== EDITOR_MARKER) {
        node = _node as ESQLSingleAstItem;
        walker.abort();
      }
    },
    visitAny: (_node) => {
      if (
        _node.type === 'function' &&
        _node.subtype === 'variadic-call' &&
        _node.location?.max >= offset
      ) {
        containingFunction = _node;
      }

      if (
        _node.location.max >= offset &&
        _node.text !== EDITOR_MARKER &&
        (!isList(_node) || _node.subtype !== 'tuple')
      ) {
        node = _node as ESQLSingleAstItem;
      }
    },
  });

  if (node) removeMarkerNode(node);

  return {
    command: removeMarkerArgFromArgsList(command)!,
    containingFunction: removeMarkerArgFromArgsList(containingFunction),
    option: removeMarkerArgFromArgsList(findOption(command.args, offset)),
    node: removeMarkerArgFromArgsList(cleanMarkerNode(node)),
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
    // if the cursor (offset) is within the range of a comment node
    if (within(offset, node.location)) {
      inComment = true;
      // or if the cursor (offset) is right after a single-line comment (which means there was no newline)
    } else if (
      node.subtype === 'single-line' &&
      node.location &&
      offset === node.location.max + 1
    ) {
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
      if (['in', 'not in'].includes(node.name)) {
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
