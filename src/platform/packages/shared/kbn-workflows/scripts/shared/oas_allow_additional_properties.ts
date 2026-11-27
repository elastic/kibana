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
import type { SpecSchemaJson } from './spec_schema_json';

const ADDITIONAL_PROPERTY_BEHAVIORS = new Set(['AdditionalProperty', 'AdditionalProperties']);

/** Returns the `namespace.Name` of every type with an `AdditionalProperty(ies)` behavior. */
export const getTypesWithAdditionalProperties = (spec: SpecSchemaJson): Set<string> =>
  new Set(
    spec.types
      .filter(({ behaviors }) =>
        behaviors?.some(({ type }) => ADDITIONAL_PROPERTY_BEHAVIORS.has(type.name))
      )
      .map(({ name }) => `${name.namespace}.${name.name}`)
  );

// openapi-ts generates `z.record(z.string(), z.unknown())` for a bare object schema.
const OPEN_OBJECT: OpenAPIV3.SchemaObject = { type: 'object' };

const isOpenObject = (schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): boolean =>
  !('$ref' in schema) &&
  schema.type === 'object' &&
  !schema.properties &&
  schema.additionalProperties !== false;

const SCHEMA_REF_PREFIX = '#/components/schemas/';

/** Returns the names of every component schema that `root` references, directly or through other schemas. */
export const getSchemaNamesReachedFrom = (
  root: unknown,
  schemas: Record<string, unknown>
): Set<string> => {
  const reached = new Set<string>();
  const pending: unknown[] = [root];
  while (pending.length > 0) {
    const node = pending.pop();
    if (node && typeof node === 'object') {
      const { $ref } = node as { $ref?: unknown };
      if (typeof $ref === 'string' && $ref.startsWith(SCHEMA_REF_PREFIX)) {
        const name = $ref.slice(SCHEMA_REF_PREFIX.length);
        if (!reached.has(name)) {
          reached.add(name);
          pending.push(schemas[name]);
        }
      }
      pending.push(...Object.values(node));
    }
  }
  return reached;
};

/**
 * The OpenAPI spec drops `AdditionalProperty` behaviors, so field-keyed entries are unknown keys.
 * Zod strips them: `sort: [{ '@timestamp': 'desc' }]` inside `inner_hits` becomes `[{}]`, and
 * `geo_distance: { distance, location }` loses `location`.
 *
 * This adds an open object to `allOf`, so the schema becomes `z.object({...}).and(z.record(...))`.
 * `additionalProperties` does not work here: the openapi-ts zod plugin ignores it when the schema
 * has `properties`. The record does not use the value type, because the spec does not emit some
 * of them (`FieldSort`).
 *
 * Only request schemas change: response schemas feed the Liquid output lookup, where an open record
 * would hide typed fields (for example a composite bucket's `key`).
 */
export const allowSpecAdditionalProperties = (
  document: OpenAPIV3.Document,
  typeNames: Set<string>
): OpenAPIV3.Document => {
  const schemas = document.components?.schemas ?? {};
  const requestSchemaNames = getSchemaNamesReachedFrom(document.components?.requestBodies, schemas);
  for (const typeName of typeNames) {
    const schema = requestSchemaNames.has(typeName) ? schemas[typeName] : undefined;
    const isOpen = schema && !('$ref' in schema) && schema.allOf?.some(isOpenObject);
    if (schema && !('$ref' in schema) && !isOpen) {
      schemas[typeName] = schema.allOf
        ? { ...schema, allOf: [...schema.allOf, OPEN_OBJECT] }
        : { allOf: [schema, OPEN_OBJECT] };
    }
  }
  return document;
};

export const createAllowSpecAdditionalProperties = (schemaPath: string) => {
  const spec = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as SpecSchemaJson;
  const typeNames = getTypesWithAdditionalProperties(spec);
  return (document: OpenAPIV3.Document) => allowSpecAdditionalProperties(document, typeNames);
};
