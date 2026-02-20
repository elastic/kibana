/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPromqlNode } from '../../embedded_languages/promql/ast/is';
import { childrenOfPromqlNode } from '../../embedded_languages/promql/ast/traversal';
import type { PromQLAstNode } from '../../embedded_languages/promql/types';
import type {
  ESQLAstExpression,
  ESQLAstHeaderCommand,
  ESQLAstItem,
  ESQLCommand,
  ESQLProperNode,
  ESQLSingleAstItem,
} from '../../types';

/**
 * Normalizes AST "item" list to only contain *single* items.
 *
 * @param items A list of single or nested items.
 */
export function* singleItems(
  items: Iterable<ESQLAstItem | ESQLAstExpression>
): Iterable<ESQLAstExpression> {
  for (const item of items) {
    if (Array.isArray(item)) {
      yield* singleItems(item);
    } else {
      yield item;
    }
  }
}

/**
 * Returns the first normalized "single item" from the "item" list.
 *
 * @param items Returns the first "single item" from the "item" list.
 * @returns A "single item", if any.
 */
export const firstItem = (items: ESQLAstItem[]): ESQLAstExpression | undefined => {
  for (const item of singleItems(items)) {
    return item;
  }
};

export const resolveItem = (items: ESQLAstItem | ESQLAstItem[]): ESQLSingleAstItem => {
  return Array.isArray(items) ? resolveItem(items[0]) : items;
};

/**
 * Returns the last normalized "single item" from the "item" list.
 *
 * @param items Returns the last "single item" from the "item" list.
 * @returns A "single item", if any.
 */
export const lastItem = (items: ESQLAstItem[]): ESQLSingleAstItem | undefined => {
  const last = items[items.length - 1];
  if (!last) return undefined;
  if (Array.isArray(last)) return lastItem(last as ESQLAstItem[]);
  return last as ESQLSingleAstItem;
};

export function* children(
  node: ESQLProperNode
): Iterable<ESQLAstExpression | ESQLCommand | ESQLAstHeaderCommand> {
  switch (node.type) {
    case 'function':
    case 'command':
    case 'header-command':
    case 'order':
    case 'option': {
      yield* singleItems(node.args);
      break;
    }
    case 'list': {
      yield* singleItems(node.values);
      break;
    }
    case 'map': {
      yield* node.entries;
      break;
    }
    case 'map-entry': {
      yield node.key;
      yield node.value;
      break;
    }
    case 'inlineCast': {
      if (Array.isArray(node.value)) {
        yield* singleItems(node.value);
      } else {
        yield node.value;
      }
      break;
    }
    case 'parens': {
      yield node.child;
      break;
    }
  }
}

export function* childrenOfAnyNode(
  node: ESQLProperNode | PromQLAstNode
): Iterable<ESQLAstExpression | ESQLCommand | ESQLAstHeaderCommand | PromQLAstNode> {
  if (isPromqlNode(node)) {
    yield* childrenOfPromqlNode(node);
    return;
  }

  if ('args' in node && Array.isArray(node.args)) {
    yield* singleItems(node.args);
    return;
  }

  switch (node.type) {
    case 'query': {
      if (node.header) {
        yield* node.header;
      }
      yield* node.commands;
      break;
    }
    case 'source': {
      if (node.prefix) {
        yield node.prefix;
      }
      if (node.index) {
        yield node.index;
      }
      if (node.selector) {
        yield node.selector;
      }
      break;
    }
    default: {
      yield* children(node);
      break;
    }
  }
}
