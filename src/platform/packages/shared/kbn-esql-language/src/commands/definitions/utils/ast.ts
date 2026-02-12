/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EDITOR_MARKER } from '../constants';
import { isColumn, isIdentifier, isList, isOptionNode, isSource } from '../../../ast/is';
import type {
  ESQLFunction,
  ESQLSingleAstItem,
  ESQLAstExpression,
  ESQLAstItem,
  ESQLCommandOption,
  ESQLAstAllCommands,
  ESQLAstHeaderCommand,
  ESQLAstQueryExpression,
} from '../../../types';
import { Walker } from '../../../..';

export function isMarkerNode(node: ESQLAstItem | undefined): boolean {
  if (Array.isArray(node)) {
    return false;
  }

  return Boolean(
    node &&
      (isColumn(node) || isIdentifier(node) || isSource(node)) &&
      node.name.endsWith(EDITOR_MARKER)
  );
}

function findCommand(ast: ESQLAstQueryExpression, offset: number) {
  const queryCommands = ast.commands;
  const commandIndex = queryCommands.findIndex(
    ({ location }) => location.min <= offset && location.max >= offset
  );

  const command = queryCommands[commandIndex] || queryCommands[queryCommands.length - 1];

  if (!command) {
    return findHeaderCommand(ast, offset);
  }

  return command;
}

function findHeaderCommand(
  ast: ESQLAstQueryExpression,
  offset: number
): ESQLAstHeaderCommand | undefined {
  if (!ast.header || ast.header.length === 0) {
    return;
  }

  const commandIndex = ast.header.findIndex(
    ({ location }) => location.min <= offset && location.max >= offset
  );

  const targetHeader = ast.header[commandIndex] || ast.header[ast.header.length - 1];

  return targetHeader.incomplete ? targetHeader : undefined;
}

export function isNotMarkerNodeOrArray(arg: ESQLAstItem) {
  return Array.isArray(arg) || !isMarkerNode(arg);
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

export function removeMarkerArgFromArgsList<T extends ESQLSingleAstItem | ESQLAstAllCommands>(
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

export function mapToNonMarkerNode(arg: ESQLAstItem): ESQLAstItem {
  return Array.isArray(arg) ? arg.filter(isNotMarkerNodeOrArray).map(mapToNonMarkerNode) : arg;
}

function cleanMarkerNode(node: ESQLSingleAstItem | undefined): ESQLSingleAstItem | undefined {
  return isMarkerNode(node) ? undefined : node;
}

function findOption(nodes: ESQLAstItem[], offset: number): ESQLCommandOption | undefined {
  return findCommandSubType(nodes, offset, isOptionNode);
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

export function findAstPosition(ast: ESQLAstQueryExpression, offset: number) {
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

/**
 * This function returns a list of closing brackets that can be appended to
 * a partial query to make it valid.
 *
 * A known limitation of this is that is not aware of commas "," or pipes "|"
 * so it is not yet helpful on a multiple commands errors (a workaround is to pass each command here...)
 *
 * It does not autocomplete missing brackets within quotes or triple quotes.
 * @param text
 * @returns
 */
export function getBracketsToClose(text: string) {
  const stack: string[] = [];

  // Order is important here, do not change it lightly,
  // we want to consume first `"""` before `"` , as `"`'s can be found inside `"""` strings,
  // and not the other way around.
  const pairs: Record<string, string> = { '"""': '"""', '/*': '*/', '(': ')', '[': ']', '"': '"' };
  const pairsReversed: Record<string, string> = {
    '"""': '"""',
    '*/': '/*',
    ')': '(',
    ']': '[',
    '"': '"',
  };

  for (let i = 0; i < text.length; i++) {
    const isInsideString = stack.some((item) => item === '"');
    const isInsideTripleQuotes = stack.some((item) => item === '"""');

    for (const openBracket in pairs) {
      if (!Object.hasOwn(pairs, openBracket)) {
        continue;
      }

      const substr = text.slice(i, i + openBracket.length);

      // If inside string, only check for closing the string
      if (isInsideString) {
        if (substr === '"') {
          stack.pop();
          break;
        }
        continue;
      }

      // If inside triple quotes, only check for closing the triple quotes
      if (isInsideTripleQuotes) {
        if (substr === '"""') {
          // If we found a tripple quote, but it's followed by more quotes, ignore, as they are part of an enclosed string.
          // I.E. : KQL("""field: "something"""")
          if (text[i + substr.length] === '"') {
            continue;
          }
          stack.pop();
          i += substr.length - 1; // We advance the cursor to consume the full lenght of the bracket
          break;
        }
        continue;
      }

      if (pairsReversed[substr] && pairsReversed[substr] === stack[stack.length - 1]) {
        stack.pop();
        i += substr.length - 1; // We advance the cursor to consume the full length of the bracket
        break;
      } else if (substr === openBracket) {
        stack.push(substr);
        i += substr.length - 1; // We advance the cursor to consume the full length of the bracket
        break;
      }
    }
  }
  return stack.reverse().map((bracket) => pairs[bracket]);
}

/**
 * This function attempts to correct the syntax of a partial query to make it valid.
 *
 * We are generally dealing with incomplete queries when the user is typing. But,
 * having an AST is helpful so we heuristically correct the syntax so it can be parsed.
 *
 * @param _query
 * @param context
 * @returns
 */
export function correctQuerySyntax(_query: string) {
  let query = _query;
  // check if all brackets are closed, otherwise close them
  const bracketsToAppend = getBracketsToClose(query);

  const endsWithBinaryOperatorRegex =
    /(?:\+|\/|==|>=|>|in|<=|<|like|:|%|\*|-|not in|not like|not rlike|!=|rlike|and|or|not|=|as)\s+$/i;
  const endsWithCastingOperatorRegex = /::\s*$/i;
  const endsWithCommaRegex = /,\s+$/;

  if (
    endsWithBinaryOperatorRegex.test(query) ||
    endsWithCastingOperatorRegex.test(query) ||
    endsWithCommaRegex.test(query)
  ) {
    query += ` ${EDITOR_MARKER}`;
  }

  query += bracketsToAppend.join('');

  return query;
}

const PROMQL_TRAILING_COMMA_REGEX = /,\s*$/;
const PROMQL_TRAILING_COLON_REGEX = /:\s*$/;

/**
 * Corrects partial PromQL syntax so the PromQL parser can build a stable AST while typing.
 * It keeps the same marker semantics used in ES|QL correction, but only for trailing
 * separators relevant to PromQL argument/subquery contexts.
 */
export function correctPromqlQuerySyntax(input: string): string {
  let query = input;

  if (
    !query.includes(EDITOR_MARKER) &&
    (PROMQL_TRAILING_COMMA_REGEX.test(query) || PROMQL_TRAILING_COLON_REGEX.test(query))
  ) {
    query += ` ${EDITOR_MARKER}`;
  }

  return query + getPromqlBracketsToClose(query);
}

function getPromqlBracketsToClose(text: string): string {
  const esqlBrackets = getBracketsToClose(text).join('');
  const promqlBraces = getPromqlBracesToClose(text);

  return promqlBraces + esqlBrackets;
}

function getPromqlBracesToClose(text: string): string {
  let count = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (char === stringChar && text[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '{') count++;
    if (char === '}') count--;
  }

  return '}'.repeat(Math.max(0, count));
}
