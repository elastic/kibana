/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AlertsFiltersExpression, Filter, FlattenedExpressionItem } from '../types';

const isFilter = (item?: AlertsFiltersExpression | Filter): item is Filter =>
  item != null && !('operator' in item);

/**
 * Traverses the expression tree in pre-order and returns a flat array of
 * { operator: ... } | { filter: ... } items
 */
export const flattenFiltersExpression = (expression: AlertsFiltersExpression | Filter) => {
  const traverse = (node: AlertsFiltersExpression | Filter): FlattenedExpressionItem[] => {
    if ('operator' in node) {
      return node.operands
        .map((operand) => traverse(operand))
        .reduce((arr: Array<FlattenedExpressionItem | FlattenedExpressionItem[]>, item) => {
          if (arr.length) {
            arr.push({
              operator: node.operator,
            });
          }
          arr.push(item);
          return arr;
        }, [])
        .flat();
    } else {
      return [
        {
          filter: node,
        },
      ];
    }
  };
  return traverse(expression);
};

/**
 * Reconstructs the expression tree from a flat array of { operator: ... } | { filter: ... } items
 */
export const reconstructFiltersExpression = (flatExpression: FlattenedExpressionItem[]) => {
  let root: AlertsFiltersExpression = { operator: 'and', operands: [] };
  let currentNode: AlertsFiltersExpression = root;

  for (const item of flatExpression) {
    if ('filter' in item) {
      currentNode.operands.push(item.filter);
    } else {
      if (item.operator === currentNode.operator) {
        // Continue adding to the current node
      } else {
        if (item.operator === 'or' && currentNode.operator === 'and') {
          if (currentNode === root && currentNode.operands.length < 2) {
            // Replace the default 'and'
            currentNode.operator = 'or';
          } else {
            // Create a new 'or' root, pushing the existing 'and' tree inside
            root = { operator: 'or', operands: [root] };
            currentNode = root;
          }
        } else {
          const operands = [];
          // If the last operand is a filter, add it to the newly
          // created and group
          if (isFilter(currentNode.operands[currentNode.operands.length - 1])) {
            operands.push(currentNode.operands.pop() as Filter);
          }
          // Nest 'and' inside 'or' for operator precedence
          const newNode: AlertsFiltersExpression = {
            operator: item.operator,
            operands,
          };
          currentNode.operands.push(newNode);
          currentNode = newNode;
        }
      }
    }
  }
  return root;
};
