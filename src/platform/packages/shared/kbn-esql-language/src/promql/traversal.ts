/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPromqlNode } from './is';
import type { PromQLAstNode, PromQLAstQueryExpression, PromQLPositionResult } from './types';

export function* childrenOfPromqlNode(node: PromQLAstNode): Iterable<PromQLAstNode> {
  if (!isPromqlNode(node)) {
    return;
  }

  switch (node.type) {
    case 'query': {
      if (node.expression) {
        yield node.expression;
      }
      return;
    }
    case 'function': {
      if (node.grouping) {
        yield node.grouping;
      }
      yield* node.args;
      return;
    }
    case 'selector': {
      yield* node.args;
      return;
    }
    case 'label': {
      const { labelName, value } = node;
      if (labelName) yield labelName;
      if (value) yield value;
      return;
    }
  }

  if ('args' in node && Array.isArray(node.args)) {
    yield* node.args;
    return;
  }
}

/** Finds the deepest node at a given offset within a PromQL AST.*/
export function findPromqlAstPosition(
  root: PromQLAstQueryExpression,
  offset: number
): PromQLPositionResult {
  const result: PromQLPositionResult = {
    node: undefined,
    parent: undefined,
  };

  if (!root.expression) {
    return result;
  }

  traverseForPosition(root.expression, root, offset, result);

  return result;
}

function traverseForPosition(
  node: PromQLAstNode,
  parent: PromQLAstNode,
  offset: number,
  result: PromQLPositionResult
): void {
  if (!isPromqlNode(node)) {
    return;
  }

  if (node.location.min <= offset && node.location.max >= offset) {
    result.node = node;
    result.parent = parent;

    for (const child of childrenOfPromqlNode(node)) {
      traverseForPosition(child, node, offset, result);
    }
  }
}

/** Collects metrics, selector labels, and breakdown labels from a PromQL expression. */
export function collectMetricsAndLabels(expression: PromQLAstNode): {
  metrics: Set<string>;
  labels: Set<string>;
  breakdownLabels: Set<string>;
} {
  const metrics = new Set<string>();
  const labels = new Set<string>();
  const breakdownLabels = new Set<string>();
  const stack: PromQLAstNode[] = [expression];

  while (stack.length > 0) {
    const node = stack.pop()!;

    if (node.type === 'selector') {
      const { metric, labelMap } = node;

      if (metric?.name) {
        metrics.add(metric.name);
      }

      for (const label of labelMap?.args ?? []) {
        if (label.labelName?.name) {
          labels.add(label.labelName.name);
        }
      }
    }

    if (node.type === 'function' && node.grouping) {
      for (const label of node.grouping.args) {
        if (label.name) {
          breakdownLabels.add(label.name);
        }
      }
    }

    for (const child of childrenOfPromqlNode(node)) {
      stack.push(child);
    }
  }

  return { metrics, labels, breakdownLabels };
}

/** Finds a PromQL expression node within ES|QL wrapper structures (parens, binary expressions). */
export function findPromqlExpression(node: unknown): PromQLAstQueryExpression | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }

  if (isPromqlNode(node)) {
    return node as PromQLAstQueryExpression;
  }

  const { child, args } = node as { child?: unknown; args?: unknown[] };

  if (child) {
    return findPromqlExpression(child);
  }

  if (args) {
    for (const arg of args) {
      const found = findPromqlExpression(Array.isArray(arg) ? arg[0] : arg);

      if (found) {
        return found;
      }
    }
  }

  return undefined;
}
