/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import type { KqlFunctionNode, KqlLiteralNode } from '@kbn/es-query/src/kuery/node_types';
/**
 * Extracts property paths from a KQL (Kibana Query Language) query string.
 *
 * This function parses a KQL query and extracts field names that appear before
 * colons in field:value expressions, ignoring quoted strings and handling
 * logical operators (AND, OR, NOT) and parentheses.
 *
 * @param kql - The KQL query string to parse
 * @returns Array of unique property paths found in the query
 *
 * @example
 * ```typescript
 * extractPropertyPathsFromKql('foo.bar:this and steps.analysis:foo')
 * // Returns: ['foo.bar', 'steps.analysis']
 *
 * extractPropertyPathsFromKql('name:"John Doe" and age:30 or status:active')
 * // Returns: ['name', 'age', 'status']
 * ```
 */
export function extractPropertyPathsFromKql(kql: string): string[] {
  if (!kql || typeof kql !== 'string') {
    return [];
  }

  const ast = fromKueryExpression(kql);
  const accumulator = new Set<string>();
  visitRecursive(ast, accumulator);
  // Filter out special KQL wildcards and sort the results
  return Array.from(accumulator);
}

function visitRecursive(node: KueryNode, accumulator: Set<string>): void {
  if (node.type === 'function') {
    const functionNode = node as KqlFunctionNode;

    switch (functionNode.function) {
      case 'and':
        functionNode.arguments.forEach((arg) => visitRecursive(arg as KueryNode, accumulator));
        break;
      case 'or':
        functionNode.arguments.forEach((arg) => visitRecursive(arg as KueryNode, accumulator));
        break;
      case 'not':
        visitRecursive(functionNode.arguments[0] as KueryNode, accumulator);
        break;
      case 'range':
        const [leftRangeLiteral] = functionNode.arguments as [
          KqlLiteralNode,
          string,
          KqlLiteralNode
        ];
        if (!leftRangeLiteral.value) {
          break;
        }
        accumulator.add(String(leftRangeLiteral.value));
        break;
      case 'is':
        const [leftLiteral, _] = node.arguments as [KqlLiteralNode, KqlLiteralNode];

        if (!leftLiteral.value) {
          break;
        }

        accumulator.add(String(leftLiteral.value));
        break;
    }
  }
}
