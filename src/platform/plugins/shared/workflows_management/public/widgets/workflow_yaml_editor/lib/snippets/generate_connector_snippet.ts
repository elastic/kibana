/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRequiredParamsForConnector } from '../get_required_params_for_connector';

/**
 * Generate a snippet template for a connector type with required parameters
 */
export function generateConnectorSnippet(
  connectorType: string,
  shouldBeQuoted: boolean,
  full: boolean = false,
  indentLevel: number = 0
): string {
  const quotedType = shouldBeQuoted ? `"${connectorType}"` : connectorType;
  let prepend = '';
  if (full) {
    prepend = `- name: ${connectorType}_step\n  type: `;
  }

  // Get required parameters for this connector type
  const requiredParams = getRequiredParamsForConnector(connectorType);

  if (requiredParams.length === 0) {
    // No required params, just add empty with block with a placeholder
    const snippet = `${prepend}${quotedType}\n${
      full ? '  ' : ''
    }with:\n  # Add parameters here. Click Ctrl+Space (Ctrl+I on Mac) to see all available options\n  `;
    return snippet;
  }

  // Create with block with required parameters as placeholders
  let withBlock = `${prepend}${quotedType}\n${full ? '  ' : ''}with:`;
  requiredParams.forEach((param) => {
    const placeholder = param.example || param.defaultValue || '';

    // Handle complex objects (like body) by formatting as YAML
    if (typeof placeholder === 'object' && placeholder !== null) {
      const yamlContent = formatObjectAsYaml(placeholder, 2);
      // if we need full snippet acount for indent level of item in yaml map
      withBlock += `\n${full ? '  ' : ''}  ${param.name}:\n${yamlContent}`;
    } else {
      withBlock += `\n${full ? '  ' : ''}  ${param.name}: ${placeholder}`;
    }
  });

  return withBlock;
}

/**
 * Format an object as YAML with proper indentation
 */
function formatObjectAsYaml(obj: any, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(`${indent}${key}:`);
      lines.push(formatObjectAsYaml(value, indentLevel + 1));
    } else if (Array.isArray(value)) {
      lines.push(`${indent}${key}:`);
      value.forEach((item) => {
        if (typeof item === 'string') {
          lines.push(`${indent}  - "${item}"`);
        } else {
          lines.push(`${indent}  - ${item}`);
        }
      });
    } else if (typeof value === 'string') {
      lines.push(`${indent}${key}: "${value}"`);
    } else {
      lines.push(`${indent}${key}: ${value}`);
    }
  }

  return lines.join('\n');
}
