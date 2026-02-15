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
import type { ExtendedAutocompleteContext } from '../../context/autocomplete.types';
import { getInputPropertyName } from '../../context/inputs_utils';

/**
 * Get suggestions for enum values from the workflow definition.
 * These are runtime values derived from the parsed YAML that can't come
 * from the static JSON Schema fed to monaco-yaml.
 */
function getEnumSuggestions(
  range: monaco.IRange,
  propertyName: string | null,
  workflowDefinition: ExtendedAutocompleteContext['workflowDefinition']
): monaco.languages.CompletionItem[] {
  if (!propertyName || !workflowDefinition?.inputs) {
    return [];
  }

  // Check if inputs is in the new JSON Schema format
  if (
    typeof workflowDefinition.inputs === 'object' &&
    !Array.isArray(workflowDefinition.inputs) &&
    'properties' in workflowDefinition.inputs
  ) {
    const properties = workflowDefinition.inputs.properties as
      | Record<string, JSONSchema7>
      | undefined;
    if (properties && typeof properties === 'object' && propertyName in properties) {
      const propertySchema = properties[propertyName] as JSONSchema7;
      if (propertySchema.enum && Array.isArray(propertySchema.enum)) {
        return propertySchema.enum.map((enumValue) => ({
          label: String(enumValue),
          kind: monaco.languages.CompletionItemKind.EnumMember,
          detail: 'Enum Value',
          documentation: {
            value: `Enum value: ${String(enumValue)}`,
            isTrusted: true,
          },
          insertText: typeof enumValue === 'string' ? `"${enumValue}"` : String(enumValue),
          range,
          sortText: String(enumValue),
        }));
      }
    }
  }

  return [];
}

/**
 * Check if we should provide enum field suggestions
 */
function shouldProvideEnumSuggestions(
  lineUpToCursor: string,
  path: (string | number)[]
): { match: RegExpMatchArray; propertyName: string | null } | null {
  const enumMatch = lineUpToCursor.match(/^(?<prefix>\s*-\s*)(?<value>.*)$/);
  if (!enumMatch) {
    return null;
  }

  const propertyName = getInputPropertyName(path);
  if (!propertyName) {
    return null;
  }

  // Check if the parent context is an enum field
  const parentPath = path.slice(0, -1);
  if (parentPath.length >= 4 && path[path.length - 2] === 'enum') {
    return { match: enumMatch, propertyName };
  }

  return null;
}

/**
 * Get JSON Schema autocompletion suggestions.
 *
 * Most JSON Schema suggestions (property keys, type values, format values) are provided
 * by monaco-yaml's schema-driven completion via the workflow Zod schema (JsonModelShapeSchema).
 * This function only provides runtime-specific suggestions that can't come from the static schema:
 * - Enum values derived from the parsed workflow definition
 */
export function getJsonSchemaSuggestions(
  autocompleteContext: ExtendedAutocompleteContext
): monaco.languages.CompletionItem[] {
  const { path, range, workflowDefinition, lineUpToCursor } = autocompleteContext;

  const enumResult = shouldProvideEnumSuggestions(lineUpToCursor, path);
  if (enumResult && enumResult.match.groups) {
    const adjustedRange = {
      ...range,
      startColumn: enumResult.match.groups.prefix.length + 1,
      endColumn: autocompleteContext.line.length + 1,
    };
    return getEnumSuggestions(adjustedRange, enumResult.propertyName, workflowDefinition);
  }

  return [];
}
