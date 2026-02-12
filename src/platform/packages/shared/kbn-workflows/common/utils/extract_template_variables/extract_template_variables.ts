/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createWorkflowLiquidEngine } from '../create_workflow_liquid_engine/create_workflow_liquid_engine';

const liquidEngine = createWorkflowLiquidEngine({
  strictFilters: false,
  strictVariables: false,
});

function isLiteral(value: string): boolean {
  // Check if it's a string literal (quoted with ' or ")
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return true;
  }

  return !Number.isNaN(Number.parseFloat(value));
}

/**
 * Extracts template variables from a Liquid template string.
 *
 * This function parses a Liquid template and returns an array of variable paths that are referenced
 * in the template. It handles various Liquid constructs including conditionals, loops, filters, and
 * more, while filtering out local variables (like loop iterators) and correctly handling array/object
 * access patterns.
 *
 * **Key behaviors:**
 * - **Local variables are excluded**: Variables created by `for`, `assign`, `capture`, and `tablerow`
 *   tags are not included in the output since they're not external inputs to the template.
 * - **Literal array/object access is preserved**: When accessing arrays or objects with literal indices
 *   (numbers or quoted strings), the full path is returned.
 * - **Variable references in brackets are truncated**: When a variable is used as an index/key
 *   (e.g., `items[i]` where `i` is a variable), the path is truncated at that point since the full
 *   path cannot be statically determined.
 *
 * @param template - A Liquid template string to parse
 * @returns An array of unique variable paths referenced in the template
 *
 * @example
 * ```typescript
 * // Returns: ['user.name', 'order.id']
 * extractTemplateVariables('Hello {{ user.name }}, order {{ order.id }}');
 *
 * // Returns: ['items[0].name', 'items[1].price']
 * extractTemplateVariables('{{ items[0].name }} - {{ items[1].price }}');
 *
 * // Returns: ['items'] (i is a local loop variable)
 * extractTemplateVariables('{% for i in (1..5) %}{{ items[i] }}{% endfor %}');
 *
 * // Returns: ['users.info.addresses'] (name is a variable reference)
 * extractTemplateVariables('{{ users.info.addresses[name].postalCode }}');
 *
 * // Returns: ['data.items["key"].value'] ("key" is a string literal)
 * extractTemplateVariables('{{ data.items["key"].value }}');
 * ```
 */
export function extractTemplateVariables(template: string): string[] {
  const globalVars = liquidEngine.globalFullVariablesSync(template);
  const truncatedVars: string[] = [];

  // Truncate variable paths at dynamic bracket accesses
  // e.g., items[i].name  =>  items
  globalVars.forEach((varPath) => {
    let isBracketOpen = false;
    let valueInBrackets = '';
    let resultVariable = '';

    for (let i = 0; i < varPath.length; i++) {
      const currentChar = varPath[i];

      if (currentChar === '[') {
        isBracketOpen = true;
      } else if (currentChar === ']') {
        isBracketOpen = false;
        if (!isLiteral(valueInBrackets)) {
          break;
        }

        resultVariable += `[${valueInBrackets}]`;
        valueInBrackets = '';
      } else if (isBracketOpen) {
        valueInBrackets += currentChar;
      } else {
        resultVariable += currentChar;
      }
    }

    if (resultVariable) {
      truncatedVars.push(resultVariable);
    }
  });

  return Array.from(new Set(truncatedVars));
}
