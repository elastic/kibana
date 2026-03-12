/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { normalizeFieldsToJsonSchema } from '@kbn/workflows/spec/lib/field_conversion';
import type { AutocompleteContext } from '../../context/autocomplete.types';

/**
 * Returns true when the cursor is inside a workflow.output step (including nested in if/foreach).
 * Uses focusedStepInfo from the YAML AST; no manual path or position scanning.
 */
export function isInWorkflowOutputWithBlock(
  focusedStepInfo: AutocompleteContext['focusedStepInfo']
): boolean {
  return focusedStepInfo?.stepType === 'workflow.output';
}

function createOutputSuggestion(
  name: string,
  schema: { type?: string; description?: string; enum?: string[] },
  isRequired: boolean,
  range: monaco.IRange
): monaco.languages.CompletionItem {
  const type = schema.type || 'string';
  const outputValuePlaceholder = type === 'string' ? '"${1:value}"' : '${1:value}';

  return {
    label: name,
    kind: monaco.languages.CompletionItemKind.Property,
    insertText: `${name}: ${outputValuePlaceholder}`,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    documentation: schema.description || `${type} output`,
    detail: `${type}${isRequired ? ' (required)' : ' (optional)'}`,
    preselect: isRequired,
  };
}

/**
 * Gets workflow outputs suggestions for autocomplete
 * Used when typing in the with: section of a workflow.output step
 *
 * NOTE: When suggestions are returned, Monaco YAML provider suggestions are suppressed
 * to ensure only declared output fields are suggested (see get_completion_item_provider.ts)
 */
export async function getWorkflowOutputsSuggestions(
  autocompleteContext: AutocompleteContext
): Promise<monaco.languages.CompletionItem[]> {
  const { focusedStepInfo, range, workflowDefinition } = autocompleteContext;

  if (focusedStepInfo?.stepType !== 'workflow.output') {
    return [];
  }

  const rawOutputs = workflowDefinition?.outputs;
  const normalizedOutputs = normalizeFieldsToJsonSchema(rawOutputs);

  if (!normalizedOutputs?.properties || Object.keys(normalizedOutputs.properties).length === 0) {
    return [];
  }

  // Get already provided output keys from the current step's with block.
  // workflowLookup records leaf props (e.g. with.result, with.count), not the with map itself.
  const existingKeys = new Set<string>();
  if (focusedStepInfo.propInfos) {
    for (const composedKey of Object.keys(focusedStepInfo.propInfos)) {
      if (composedKey.startsWith('with.')) {
        const fieldName = composedKey.slice('with.'.length).split('.')[0];
        if (fieldName) {
          existingKeys.add(fieldName);
        }
      }
    }
  }

  const suggestions: monaco.languages.CompletionItem[] = [];

  for (const [name, propSchema] of Object.entries(normalizedOutputs.properties)) {
    if (!existingKeys.has(name) && propSchema && typeof propSchema === 'object') {
      const isRequired = normalizedOutputs.required?.includes(name) ?? false;
      suggestions.push(
        createOutputSuggestion(
          name,
          propSchema as { type?: string; description?: string; enum?: string[] },
          isRequired,
          range
        )
      );
    }
  }

  return suggestions;
}
