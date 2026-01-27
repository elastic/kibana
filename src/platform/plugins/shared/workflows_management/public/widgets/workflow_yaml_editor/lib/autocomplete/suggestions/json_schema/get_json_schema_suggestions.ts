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
 * Check if we should provide property key suggestions.
 * Returns false if line already has a property key with colon (e.g., "type: ") to allow value suggestions instead.
 */
function shouldProvidePropertyKeySuggestions(
  path: (string | number)[],
  lineUpToCursor: string,
  autocompleteContext: ExtendedAutocompleteContext
): boolean {
  if (path.length < 2 || path[0] !== 'inputs' || path[1] !== 'properties') {
    return false;
  }

  if (autocompleteContext.isInTriggersContext || autocompleteContext.isInStepsContext) {
    return false;
  }

  // Don't suggest property keys if line already has a property key with colon
  const hasPropertyKeyWithColon = /^\s*[a-zA-Z_][a-zA-Z0-9_-]*\s*:\s*/.test(lineUpToCursor);
  if (hasPropertyKeyWithColon) {
    return false;
  }

  const isEmptyOrWhitespace = /^\s*$/.test(lineUpToCursor);
  const isTypingPropertyKey = /^\s*([a-zA-Z_][a-zA-Z0-9_-]*)?\s*:?\s*$/.test(lineUpToCursor);

  if (!isEmptyOrWhitespace && !isTypingPropertyKey) {
    return false;
  }

  // Handle empty line after property definition (path length 2 with 6+ spaces indentation)
  if (path.length === 2) {
    const indentMatch = lineUpToCursor.match(/^(\s*)/);
    const indentLevel = indentMatch ? indentMatch[1].length : 0;
    if (indentLevel >= 6) {
      return true;
    }
  }

  // Inside property definition (path length 3) or nested property (path length 4)
  if (path.length === 3 || (path.length === 4 && typeof path[3] === 'string')) {
    return true;
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

  let inferredPath = path;
  if (path.length === 0 && autocompleteContext.model) {
    const indentLevel = lineUpToCursor.match(/^(\s*)/)?.[1]?.length ?? 0;
    if (indentLevel >= 6) {
      const lineNumber = autocompleteContext.position.lineNumber;
      for (let prevLineNum = lineNumber - 1; prevLineNum >= 1; prevLineNum--) {
        const prevLine = autocompleteContext.model.getLineContent(prevLineNum);
        if (prevLine.trim() !== '') {
          if (prevLine.match(/^\s{2}properties\s*:/)) {
            inferredPath = ['inputs', 'properties'];
            break;
          }
          const propertyMatch = prevLine.match(/^\s{4}([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/);
          if (propertyMatch && indentLevel >= 6) {
            inferredPath = ['inputs', 'properties', propertyMatch[1]];
            break;
          }
          if (prevLine.match(/^\s{0,2}[a-zA-Z]/)) {
            break;
          }
        }
      }
    }
  }

  if (!isInInputsPropertiesContext(inferredPath)) {
    return [];
  }

  if (
    shouldProvideTypeSuggestions(lineParseResult, inferredPath, autocompleteContext) &&
    lineParseResult
  ) {
    if (lineParseResult.matchType === 'type') {
      const adjustedRange = {
        ...range,
        startColumn: lineParseResult.valueStartIndex + 1,
        endColumn: autocompleteContext.line.length + 1,
      };
      return getTypeSuggestions(adjustedRange);
    }
  }

  const formatMatch = shouldProvideFormatSuggestions(lineUpToCursor);
  if (formatMatch?.groups) {
    const adjustedRange = {
      ...range,
      startColumn: formatMatch.groups.prefix.length + 1,
      endColumn: autocompleteContext.line.length + 1,
    };
    return getFormatSuggestions(adjustedRange);
  }

  const enumResult = shouldProvideEnumSuggestions(lineUpToCursor, inferredPath);
  if (enumResult && enumResult.match.groups) {
    const adjustedRange = {
      ...range,
      startColumn: enumResult.match.groups.prefix.length + 1,
      endColumn: autocompleteContext.line.length + 1,
    };
    return getEnumSuggestions(adjustedRange, enumResult.propertyName, workflowDefinition);
  }

  if (shouldProvidePropertyKeySuggestions(inferredPath, lineUpToCursor, autocompleteContext)) {
    return getPropertyKeySuggestions(range);
  }

  return [];
}
