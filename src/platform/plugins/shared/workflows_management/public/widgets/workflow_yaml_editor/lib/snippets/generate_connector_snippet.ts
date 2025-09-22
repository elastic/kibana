/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMac } from '../../../../shared/utils/is_mac';
import { getRequiredParamsForConnector } from '../get_required_params_for_connector';

interface GenerateConnectorSnippetOptions {
  full?: boolean;
}

/**
 * Generates a YAML snippet for a workflow connector step based on the specified type.
 * @param connectorType - The type of connector to generate a snippet for
 * @param options - Configuration options for snippet generation
 * @param options.full - Whether to include the full YAML structure with step name and type prefix
 * @returns The formatted YAML connector snippet with required parameters as placeholders
 */
export function generateConnectorSnippet(
  connectorType: string,
  { full }: GenerateConnectorSnippetOptions = {}
): string {
  let prepend = '';
  if (full) {
    prepend = `- name: ${connectorType}_step\n  type: `;
  }

  // Get required parameters for this connector type
  const requiredParams = getRequiredParamsForConnector(connectorType);

  if (requiredParams.length === 0) {
    // No required params, just add empty with block with a placeholder
    const shortcut = isMac() ? '⌘+I' : 'Ctrl+Space';
    const snippet = `${prepend}${connectorType}\n${
      full ? '  ' : ''
    }with:\n  # Add parameters here. Press ${shortcut} to see all available options\n  `;
    return snippet;
  }

  // Create with block with required parameters as placeholders
  let withBlock = `${prepend}${connectorType}\n${full ? '  ' : ''}with:`;
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
