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
import { getInputPropertyName, isInInputsPropertiesContext } from '../../context/inputs_utils';

/**
 * JSON Schema type values (Draft 7 standard)
 * Reference: https://json-schema.org/draft-07/schema
 */
const JSON_SCHEMA_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
  'null',
] as const;

/**
 * Common JSON Schema format values (Draft 7 standard)
 * Reference: https://json-schema.org/draft-07/schema#section-7.3
 */
const JSON_SCHEMA_FORMATS = [
  'date-time',
  'date',
  'time',
  'email',
  'idn-email',
  'hostname',
  'idn-hostname',
  'ipv4',
  'ipv6',
  'uri',
  'uri-reference',
  'iri',
  'iri-reference',
  'uri-template',
  'json-pointer',
  'relative-json-pointer',
  'regex',
  'uuid',
] as const;

/**
 * Common JSON Schema property keywords
 * Reference: https://json-schema.org/draft-07/schema
 */
const JSON_SCHEMA_PROPERTIES = [
  'type',
  'format',
  'enum',
  'const',
  'description',
  'default',
  'properties',
  'required',
  'items',
  'additionalProperties',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minItems',
  'maxItems',
  'uniqueItems',
  'pattern',
  'multipleOf',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
] as const;

/**
 * Get suggestions for JSON Schema type field
 */
function getTypeSuggestions(range: monaco.IRange): monaco.languages.CompletionItem[] {
  return JSON_SCHEMA_TYPES.map((type) => ({
    label: type,
    kind: monaco.languages.CompletionItemKind.Value,
    detail: 'JSON Schema Type',
    documentation: {
      value: `JSON Schema type: ${type}`,
      isTrusted: true,
    },
    insertText: `"${type}"`,
    range,
    sortText: type,
  }));
}

/**
 * Get suggestions for JSON Schema format field
 */
function getFormatSuggestions(range: monaco.IRange): monaco.languages.CompletionItem[] {
  return JSON_SCHEMA_FORMATS.map((format) => ({
    label: format,
    kind: monaco.languages.CompletionItemKind.Value,
    detail: 'JSON Schema Format',
    documentation: {
      value: `JSON Schema format: ${format}`,
      isTrusted: true,
    },
    insertText: `"${format}"`,
    range,
    sortText: format,
  }));
}

/**
 * Get suggestions for enum values from the workflow definition
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
    const properties = workflowDefinition.inputs.properties;
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
 * Get suggestions for JSON Schema property keys
 */
function getPropertyKeySuggestions(range: monaco.IRange): monaco.languages.CompletionItem[] {
  return JSON_SCHEMA_PROPERTIES.map((prop) => ({
    label: prop,
    kind: monaco.languages.CompletionItemKind.Property,
    detail: 'JSON Schema Property',
    documentation: {
      value: `JSON Schema property: ${prop}`,
      isTrusted: true,
    },
    insertText: `${prop}: `,
    range,
    sortText: prop,
  }));
}

/**
 * Check if we should provide type field suggestions
 */
function shouldProvideTypeSuggestions(
  lineParseResult: ExtendedAutocompleteContext['lineParseResult'],
  path: (string | number)[],
  autocompleteContext: ExtendedAutocompleteContext
): boolean {
  return (
    lineParseResult?.matchType === 'type' &&
    path.length >= 3 &&
    path[0] === 'inputs' &&
    path[1] === 'properties' &&
    !autocompleteContext.isInTriggersContext &&
    !autocompleteContext.isInStepsContext
  );
}

/**
 * Check if we should provide format field suggestions
 */
function shouldProvideFormatSuggestions(lineUpToCursor: string): RegExpMatchArray | null {
  return lineUpToCursor.match(/^(?<prefix>\s*format\s*:\s*)(?<value>.*)$/);
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
 * Check if we should provide property key suggestions
 */
function shouldProvidePropertyKeySuggestions(
  path: (string | number)[],
  lineUpToCursor: string
): boolean {
  if (path.length < 3 || path[0] !== 'inputs' || path[1] !== 'properties') {
    return false;
  }

  // If path length is 3, we're at the property level and can suggest keys
  // If path length is 4+, we're inside a nested property
  if (path.length === 3 || (path.length === 4 && typeof path[3] === 'string')) {
    // Check if the line looks like we're typing a property key
    const lineMatch = lineUpToCursor.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*)?\s*:?\s*$/);
    if (lineMatch) {
      // Don't suggest if we already have a complete key:value pair
      const hasCompletePair = lineUpToCursor.match(/^\s*\w+\s*:\s*\S/);
      return !hasCompletePair;
    }
  }

  return false;
}

/**
 * Get JSON Schema autocompletion suggestions
 */
export function getJsonSchemaSuggestions(
  autocompleteContext: ExtendedAutocompleteContext
): monaco.languages.CompletionItem[] {
  const { lineParseResult, path, range, workflowDefinition, lineUpToCursor } = autocompleteContext;

  // Only provide suggestions if we're in the inputs.properties context
  if (!isInInputsPropertiesContext(path)) {
    return [];
  }

  // Check if we're completing a type field value
  if (shouldProvideTypeSuggestions(lineParseResult, path, autocompleteContext) && lineParseResult) {
    const adjustedRange = {
      ...range,
      startColumn: lineParseResult.valueStartIndex + 1,
      endColumn: autocompleteContext.line.length + 1,
    };
    return getTypeSuggestions(adjustedRange);
  }

  // Check if we're completing a format field value
  const formatMatch = shouldProvideFormatSuggestions(lineUpToCursor);
  if (formatMatch?.groups) {
    const adjustedRange = {
      ...range,
      startColumn: formatMatch.groups.prefix.length + 1,
      endColumn: autocompleteContext.line.length + 1,
    };
    return getFormatSuggestions(adjustedRange);
  }

  // Check if we're completing an enum field value
  const enumResult = shouldProvideEnumSuggestions(lineUpToCursor, path);
  if (enumResult && enumResult.match.groups) {
    const adjustedRange = {
      ...range,
      startColumn: enumResult.match.groups.prefix.length + 1,
      endColumn: autocompleteContext.line.length + 1,
    };
    return getEnumSuggestions(adjustedRange, enumResult.propertyName, workflowDefinition);
  }

  // Check if we're at a property key level (e.g., after "properties.myProperty:")
  if (shouldProvidePropertyKeySuggestions(path, lineUpToCursor)) {
    return getPropertyKeySuggestions(range);
  }

  return [];
}
