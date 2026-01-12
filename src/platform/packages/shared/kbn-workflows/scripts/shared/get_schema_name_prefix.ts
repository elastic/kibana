/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Get the schema name prefix for a given operation id. This is just a reflection of the @hey-api/openapi-ts plugin implementation of {{name}}
 * @param operationId - The operation id to get the schema name prefix for.
 * @returns The schema name prefix.
 */
export function getSchemaNamePrefix(operationId: string): string {
  return toSnakeCase(camelToSnake(sanitizeNamespaceIdentifier(operationId)));
}

// copied from packages/openapi-ts/src/openApi/common/parser/sanitize.ts, which is licensed under the MIT license
/**
 * Sanitizes namespace identifiers so they are valid TypeScript identifiers of a certain form.
 *
 * 1: Remove any leading characters that are illegal as starting character of a typescript identifier.
 * 2: Replace illegal characters in remaining part of type name with hyphen (-).
 *
 * Step 1 should perhaps instead also replace illegal characters with underscore, or prefix with it, like sanitizeEnumName
 * does. The way this is now one could perhaps end up removing all characters, if all are illegal start characters. It
 * would be sort of a breaking change to do so, though, previously generated code might change then.
 *
 * JavaScript identifier regexp pattern retrieved from https://developer.mozilla.org/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers
 *
 * The output of this is expected to be converted to PascalCase
 */
export const sanitizeNamespaceIdentifier = (name: string) =>
  name
    .replace(/^[^\p{ID_Start}]+/u, '')
    .replace(/[^$\u200c\u200d\p{ID_Continue}]/gu, '-')
    .replace(/[$+]/g, '-');

export function camelToSnake(str: string): string {
  // Insert underscores before capital letters, but treat consecutive capitals (abbreviations) as a single unit
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1_$2') // Insert underscore between lowercase/digit and uppercase
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2') // Insert underscore between abbreviation and next word
    .toLowerCase();
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/-(\d+)/g, '$1') // Remove hyphen before numbers
    .replace(/-/g, '_') // Replace remaining hyphens with underscores
    .replace(/\./g, '_'); // Replace dots with underscores
}
