/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { OpenAPIV3 } from 'openapi-types';
import { findPropertySchema, type SpecSchemaJson } from './spec_schema_json';

// The spec marks these with `@shortcut_property`, but Elasticsearch rejects the shortcut form.
// `function_score: [...]` fails with a parsing_exception.
const EXCLUDED_TYPES = new Set(['_types.query_dsl.FunctionScoreQuery']);

/** Returns `{ 'namespace.Name': shortcutPropertyName }` for every type that has `@shortcut_property`. */
export const getShortcutProperties = (spec: SpecSchemaJson): Map<string, string> => {
  const result = new Map<string, string>();
  for (const type of spec.types) {
    const key = `${type.name.namespace}.${type.name.name}`;
    if (type.shortcutProperty && !EXCLUDED_TYPES.has(key)) {
      result.set(key, type.shortcutProperty);
    }
  }
  return result;
};

/**
 * The OpenAPI spec drops `@shortcut_property`, so `{ term: { status: 500 } }` or
 * `{ prefix: { host: 'web' } }` fail validation. This wraps each such schema in
 * `anyOf: [<full object schema>, <shortcut property schema>]`.
 * The full object goes first: zod picks the first matching branch, and some shortcut types
 * are all-optional objects (`ScriptSource` includes `SearchRequestBody`) that strip every key.
 */
export const allowShortcutProperties = (
  document: OpenAPIV3.Document,
  shortcutProperties: Map<string, string>
): OpenAPIV3.Document => {
  const schemas = document.components?.schemas;
  if (!schemas) {
    return document;
  }
  for (const [schemaName, propertyName] of shortcutProperties) {
    const schema = schemas[schemaName];
    const propertySchema =
      schema && !('$ref' in schema) ? findPropertySchema(schema, propertyName) : undefined;
    if (schema && propertySchema) {
      schemas[schemaName] = { anyOf: [schema, propertySchema] };
    }
  }
  return document;
};

export const createAllowShortcutProperties = (schemaPath: string) => {
  const spec = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as SpecSchemaJson;
  const shortcutProperties = getShortcutProperties(spec);
  return (document: OpenAPIV3.Document) => allowShortcutProperties(document, shortcutProperties);
};
