/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import { monaco } from '@kbn/monaco';
import {
  type NormalizableFieldSchema,
  normalizeFieldsToJsonSchema,
} from '@kbn/workflows/spec/lib/field_conversion';
import { getPlaceholderForProperty } from './workflow_input_placeholder';
import { getOutputsFromYamlDocument } from '../../../../../../features/validate_workflow_yaml/lib/validate_workflow_outputs_in_yaml';
import type { AutocompleteContext } from '../../context/autocomplete.types';

function getRawOutputs(context: AutocompleteContext): NormalizableFieldSchema | undefined {
  return (
    context.workflowDefinition?.outputs ??
    (context.yamlDocument ? getOutputsFromYamlDocument(context.yamlDocument) : undefined)
  );
}

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
  schema: JSONSchema7,
  isRequired: boolean,
  range: monaco.IRange
): monaco.languages.CompletionItem {
  const type = (schema.type as string) || 'string';
  const placeholder = getPlaceholderForProperty(schema);

  return {
    label: name,
    kind: monaco.languages.CompletionItemKind.Property,
    insertText: `${name}: ${placeholder}`,
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
  const { focusedStepInfo, range } = autocompleteContext;

  if (focusedStepInfo?.stepType !== 'workflow.output') {
    return [];
  }

  // Use workflowDefinition.outputs when available; otherwise read from current YAML document
  // so autocomplete works even when computed workflow definition doesn't have outputs yet
  const rawOutputs = getRawOutputs(autocompleteContext);
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

  // Output suggestions are KEYS (property names). Only show them when the cursor
  // is in a key position — not in a value position (after "key: ").
  // This matches how other steps work: custom property suggestions require
  // focusedYamlPair (value position), while output suggestions are the inverse.
  const trimmedLine = autocompleteContext.line.trimStart();
  if (trimmedLine.startsWith('with:') || /^[\w][\w-]*\s*:/.test(trimmedLine)) {
    return [];
  }

  const suggestions: monaco.languages.CompletionItem[] = [];

  for (const [name, propSchema] of Object.entries(normalizedOutputs.properties)) {
    if (!existingKeys.has(name) && propSchema && typeof propSchema === 'object') {
      const isRequired = normalizedOutputs.required?.includes(name) ?? false;
      suggestions.push(createOutputSuggestion(name, propSchema as JSONSchema7, isRequired, range));
    }
  }

  return suggestions;
}
