/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { z } from '@kbn/zod';
import { getConnectorParamsSchema } from './get_connector_with_schema';
import { getExistingParametersInWithBlock } from './get_existing_parameters_in_with_block';
import { getEnhancedTypeInfo } from '../../snippets/generate_connector_snippet';
import type { ExtendedAutocompleteContext } from '../autocomplete.types';

// eslint-disable-next-line complexity
export function getWithBlockSuggestions(autocompleteContext: ExtendedAutocompleteContext) {
  const suggestions: monaco.languages.CompletionItem[] = [];
  const { line, lineUpToCursor, range, dynamicConnectorTypes, focusedStepInfo, model, position } =
    autocompleteContext;

  const connectorType = focusedStepInfo?.stepType ?? null;

  // 🔍 SPECIAL CASE: Check if we're inside a connector's 'with' block
  // Checking if we're inside a connector's 'with' block
  // Detected connector type
  // If we're in a connector with block, prioritize connector-specific suggestions
  if (!connectorType) {
    return [];
  }
  // First check if we're inside an array item - if so, don't show parameter suggestions
  const isInArrayItem = lineUpToCursor.match(/^\s*-\s+/) !== null;

  if (isInArrayItem) {
    // We're in an array item, don't show connector parameter suggestions
    // Instead, return empty suggestions or appropriate array value suggestions
    return [];
  }

  // Special case: if we're on a comment line in a with block, skip value detection
  // and go straight to showing connector parameters
  const isOnCommentLine = line.trim().startsWith('#');

  if (isOnCommentLine) {
    // We're on a comment line in a with block - show connector parameters
    // Skip the value position detection and go straight to parameter suggestions
    // This will fall through to the connector parameter suggestions below
  } else {
    // Check if we're typing a value (after colon with content)
    const colonIndex = lineUpToCursor.lastIndexOf(':');

    // More precise detection: are we actually in a value position?
    // We are in value position if:
    // 1. There's a colon in the line
    // 2. There's non-whitespace content after the colon (we're editing a value)
    // 3. OR if the cursor is right after ": " (ready to type value)
    const isInValuePosition =
      colonIndex !== -1 &&
      // Pattern 1: "key: value" where cursor is in/after value
      (/:\s+\S/.test(lineUpToCursor) ||
        // Pattern 2: "key: " where cursor is right after the space (about to type value)
        lineUpToCursor.endsWith(': ') ||
        // Pattern 3: "key:" where cursor is right after colon
        lineUpToCursor.endsWith(':'));

    // Analyzing cursor position

    if (isInValuePosition) {
      // Typing value after colon, not suggesting parameter names

      // Extract the parameter name more carefully
      // Get everything before the colon, remove leading whitespace and dashes
      const beforeColon = lineUpToCursor.substring(0, colonIndex);
      const paramName = beforeColon.replace(/^\s*-?\s*/, '').trim();
      // Parameter name extracted

      // Only provide value suggestions if we have a valid parameter name
      if (paramName && !paramName.includes(' ')) {
        // Provide basic value suggestions based on common parameter patterns
        const valueSuggestions: monaco.languages.CompletionItem[] = [];

        if (
          paramName.includes('enabled') ||
          paramName.includes('disabled') ||
          paramName.endsWith('Stream')
        ) {
          valueSuggestions.push(
            {
              label: 'true',
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: 'true',
              range,
              documentation: 'Boolean true value',
            },
            {
              label: 'false',
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: 'false',
              range,
              documentation: 'Boolean false value',
            }
          );
        } else if (
          paramName.includes('size') ||
          paramName.includes('count') ||
          paramName.includes('limit')
        ) {
          valueSuggestions.push({
            label: '10',
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: '10',
            range,
            documentation: 'Numeric value',
          });
        } else if (lineUpToCursor.match(/:\s*$/)) {
          // Generic string placeholder only if the value is still empty
          valueSuggestions.push({
            label: '""',
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: '""',
            range,
            documentation: 'String value',
            command: {
              id: 'cursorMove',
              title: 'Move cursor left',
              arguments: ['cursorMove', { to: 'left' }],
            },
          });
        }

        return valueSuggestions;
      }

      // If we can't determine a valid parameter name, don't show any suggestions
      return [];
    }
  }

  // Get connector schema if we detected a connector type
  let schemaToUse: Record<string, z.ZodType> | null = null;

  if (!dynamicConnectorTypes) {
    return [];
  }

  schemaToUse = getConnectorParamsSchema(connectorType, dynamicConnectorTypes);
  // Schema lookup for connector type

  // Connector registry lookup

  if (!schemaToUse) {
    return [];
  }
  // Using connector-specific schema

  // Get existing parameters in the with block to avoid duplicates using Monaco
  const existingParams = getExistingParametersInWithBlock(model, position);
  // Found existing parameters in with block

  // Use the connector's specific parameter schema instead of the generic schema
  for (const [key, currentSchema] of Object.entries(schemaToUse) as [string, z.ZodType][]) {
    // Skip if parameter already exists (unless it's an empty value)
    if (existingParams.has(key)) {
      // Skipping existing parameter
      // eslint-disable-next-line no-continue
      continue;
    }

    // Get enhanced type information
    const typeInfo = getEnhancedTypeInfo(currentSchema);

    // Create a YAML key-value snippet suggestion with cursor positioning
    let insertText = `${key}: `;
    let insertTextRules = monaco.languages.CompletionItemInsertTextRule.None;

    // Smart default values based on type and parameter name
    // Check array types first to avoid conflicts with name-based matching
    if (typeInfo.type.includes('[]')) {
      // Array type - provide proper array structure
      const elementType = typeInfo.type.replace('[]', '');
      if (elementType === 'string') {
        insertText = `${key}:\n  - "\${1:}"`;
      } else {
        insertText = `${key}:\n  - \${1:}`;
      }
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    } else if (
      typeInfo.type === 'boolean' ||
      key.includes('enabled') ||
      key.includes('disabled') ||
      key.endsWith('Stream')
    ) {
      insertText = `${key}: \${1:true}`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    } else if (
      typeInfo.type === 'number' ||
      key.includes('size') ||
      key.includes('count') ||
      key.includes('limit')
    ) {
      const defaultValue = typeInfo.example || '10';
      insertText = `${key}: \${1:${defaultValue}}`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    } else if (
      typeInfo.type === 'string' ||
      key.includes('message') ||
      key.includes('text') ||
      key.includes('content')
    ) {
      const placeholder = typeInfo.example || '';
      insertText = `${key}: "\${1:${placeholder}}"`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    } else if (typeInfo.type === 'object') {
      // Object type
      insertText = `${key}:\n  \${1:}`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    } else if (typeInfo.example) {
      // Use example if available
      insertText = `${key}: \${1:${typeInfo.example}}`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    } else {
      // Generic case - just add colon and space, then trigger suggestions
      insertText = `${key}: `;
    }

    // If it's kbn-xsrf, skip it since we don't need to suggest it
    if (key === 'kbn-xsrf') {
      // eslint-disable-next-line no-continue
      continue;
    }

    // Create enhanced detail with type and required status
    const requiredIndicator = typeInfo.isRequired ? '(required)' : '(optional)';
    const detail = `${typeInfo.type} ${requiredIndicator}`;

    // Create rich documentation
    let documentation = `**${connectorType} Parameter: ${key}**\n\n`;
    documentation += `**Type:** \`${typeInfo.type}\`\n`;
    documentation += `**Required:** ${typeInfo.isRequired ? 'Yes' : 'No'}\n`;

    if (typeInfo.description) {
      documentation += `\n**Description:** ${typeInfo.description}\n`;
    }

    if (typeInfo.example) {
      documentation += `\n**Example:** \`${typeInfo.example}\`\n`;
    }

    documentation += `\n*This parameter is specific to the ${connectorType} connector.*`;

    const suggestion: monaco.languages.CompletionItem = {
      label: key,
      kind: monaco.languages.CompletionItemKind.Variable,
      insertText,
      insertTextRules,
      range,
      sortText: `!${key}`, // High priority sorting
      detail,
      documentation: {
        value: documentation,
      },
      preselect: true,
      // Trigger autocomplete for value suggestions if no snippet placeholders
      command:
        insertTextRules === monaco.languages.CompletionItemInsertTextRule.None
          ? {
              id: 'editor.action.triggerSuggest',
              title: 'Trigger Suggest',
            }
          : undefined,
    };

    suggestions.push(suggestion);
  }

  // Returning connector-specific suggestions

  // 🎯 CONNECTOR-SPECIFIC MODE: Only return our suggestions, ignore others
  // CONNECTOR-SPECIFIC MODE: Returning only connector parameters

  // 🎯 SUCCESS: We found connector-specific suggestions and will return only these

  // Return the connector-specific suggestions
  return suggestions;
}
