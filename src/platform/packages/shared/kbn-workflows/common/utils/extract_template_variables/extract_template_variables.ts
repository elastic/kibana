/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function extractTemplateVariables(template: string): string[] {
  const variables: string[] = [];
  const seen = new Set<string>();

  // Combined regex to match all Nunjucks patterns in order of appearance
  const allPatternsRegex = /\{\{\s*([^}]+?)\s*\}\}|\{\%\s*(if|elif|for|set)\s+([^%]+?)\s*\%\}/g;

  // Function to extract variable names from expressions
  function extractVariableFromExpression(expression: string): string[] {
    const vars: string[] = [];

    // Handle 'for' loops: "item in collection" -> extract "collection"
    const forMatch = expression.match(/^\s*(\w+)\s+in\s+(.+)$/);
    if (forMatch) {
      const [, , collection] = forMatch;
      vars.push(collection.trim());
      return vars;
    }

    // For other expressions, extract all variable-like patterns
    // This pattern matches:
    // - Simple variables: user, name
    // - Nested properties: user.name, user.profile.firstName
    // - Array access: items[0], user.items[0].name
    // - Function calls: user.getFullName()
    const variablePattern =
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[[^\]]+\]|\(\))*)/g;

    let match;
    while ((match = variablePattern.exec(expression)) !== null) {
      const variable = match[1];
      // Skip common keywords and operators
      if (
        !['in', 'and', 'or', 'not', 'is', 'true', 'false', 'null', 'undefined'].includes(variable)
      ) {
        vars.push(variable);
      }
    }

    return vars;
  }

  // Process all patterns in order of appearance
  let match;
  while ((match = allPatternsRegex.exec(template)) !== null) {
    let expression: string;

    if (match[1]) {
      // Variable output: {{ variable }}
      expression = match[1];
    } else if (match[3]) {
      // Control statement: {% keyword expression %}
      expression = match[3];
    } else {
      continue;
    }

    const vars = extractVariableFromExpression(expression);
    vars.forEach((variable) => {
      if (!seen.has(variable)) {
        seen.add(variable);
        variables.push(variable);
      }
    });
  }

  return variables;
}
