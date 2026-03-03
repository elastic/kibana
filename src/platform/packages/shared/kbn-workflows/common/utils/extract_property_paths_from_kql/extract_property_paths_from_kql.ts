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
import { extractTemplateVariables } from '../extract_template_variables/extract_template_variables';

// Placeholder value used to replace template expressions in KQL
// This allows the KQL parser to process the query without failing on template syntax
const TEMPLATE_PLACEHOLDER = '"__TEMPLATE_PLACEHOLDER__"';

/**
 * Replaces Handlebars template expressions ({{ ... }}) with a valid KQL placeholder.
 * This allows the KQL parser to process queries that contain dynamic template values.
 * Also handles malformed/unclosed template expressions to prevent KQL parsing errors.
 *
 * @param kql - The KQL query string potentially containing Handlebars expressions
 * @returns The KQL string with template expressions replaced by placeholders
 */
function replaceTemplateExpressions(kql: string): string {
  // First, match complete {{ ... }} patterns
  // Use [^{}]* instead of [^}]* to prevent ReDoS from catastrophic backtracking
  let result = kql.replace(/\{\{[^{}]*\}\}/g, TEMPLATE_PLACEHOLDER);

  // Also handle unclosed template expressions (e.g., "{{ incomplete" without closing }})
  // This ensures malformed templates don't break KQL parsing
  // Use [^{}]* instead of [^}]* to prevent ReDoS from catastrophic backtracking
  result = result.replace(/\{\{[^{}]*$/g, TEMPLATE_PLACEHOLDER);

  return result;
}

/**
 * Extracts property paths from a KQL (Kibana Query Language) query string.
 *
 * This function parses a KQL query and extracts field names that appear before
 * colons in field:value expressions, ignoring quoted strings and handling
 * logical operators (AND, OR, NOT) and parentheses.
 *
 * It also handles template expressions ({{ ... }}) by:
 * 1. Replacing them with placeholders before KQL parsing
 * 2. Extracting template variables separately
 * 3. Combining both sets of results
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
 *
 * extractPropertyPathsFromKql('foreach.item: {{ consts.favorite_person }}')
 * // Returns: ['foreach.item', 'consts.favorite_person']
 * ```
 */
export function extractPropertyPathsFromKql(kql: string): string[] {
  if (!kql || typeof kql !== 'string') {
    return [];
  }

  const accumulator = new Set<string>();

  // Extract template variables first (e.g., from {{ consts.favorite_person }})
  // Wrap in try-catch to handle malformed template expressions gracefully
  try {
    const templateVariables = extractTemplateVariables(kql);
    templateVariables.forEach((variable) => accumulator.add(variable));
  } catch {
    // If template extraction fails (e.g., malformed {{ without closing }}),
    // continue with KQL parsing to extract what we can
  }

  // Replace template expressions with placeholders so KQL parser can process the query
  const sanitizedKql = replaceTemplateExpressions(kql);

  try {
    const ast = fromKueryExpression(sanitizedKql);
    visitRecursive(ast, accumulator);
  } catch {
    // If KQL parsing fails even after sanitization, we still return the template variables
    // This provides graceful degradation for edge cases
  }

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
