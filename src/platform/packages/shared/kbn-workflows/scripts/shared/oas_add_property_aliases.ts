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
import { getObjectSchemas, type SpecProperty, type SpecSchemaJson } from './spec_schema_json';

type PropertyAliases = Map<string, string[]>;

const toAliasMap = (properties: SpecProperty[] = []): PropertyAliases =>
  new Map(
    properties
      .filter(({ aliases }) => aliases && aliases.length > 0)
      .map(({ name, aliases }) => [name, aliases ?? []])
  );

/**
 * Returns property aliases keyed by OpenAPI location:
 * - `schemas`: `{ 'namespace.Name': aliases }` for interface types
 * - `requestBodies`: `{ endpointName: aliases }` for request bodies
 */
export const getPropertyAliases = (spec: SpecSchemaJson) => {
  const schemas = new Map<string, PropertyAliases>();
  const requestBodiesByType = new Map<string, PropertyAliases>();

  for (const type of spec.types) {
    const key = `${type.name.namespace}.${type.name.name}`;
    if (type.kind === 'interface') {
      const aliases = toAliasMap(type.properties);
      if (aliases.size > 0) {
        schemas.set(key, aliases);
      }
    } else if (type.kind === 'request' && type.body?.kind === 'properties') {
      const aliases = toAliasMap(type.body.properties);
      if (aliases.size > 0) {
        requestBodiesByType.set(key, aliases);
      }
    }
  }

  const requestBodies = new Map<string, PropertyAliases>();
  for (const { name, request } of spec.endpoints) {
    const aliases = request && requestBodiesByType.get(`${request.namespace}.${request.name}`);
    if (aliases) {
      requestBodies.set(name, aliases);
    }
  }

  return { schemas, requestBodies };
};

const addAliases = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  aliases: PropertyAliases
) => {
  for (const objectSchema of getObjectSchemas(schema)) {
    const { properties = {} } = objectSchema;
    for (const [name, names] of aliases) {
      const propertySchema = properties[name];
      if (propertySchema) {
        for (const alias of names) {
          properties[alias] ??= propertySchema;
        }
        // Either the property or one of its aliases is enough, so the property is no longer required.
        objectSchema.required = objectSchema.required?.filter((required) => required !== name);
      }
    }
  }
};

/**
 * The OpenAPI spec drops `@aliases`, so `aggs` (alias of `aggregations`) is not a known key.
 * Zod strips unknown keys, so a valid workflow silently runs without its aggregations.
 * This adds each alias as an extra optional property with the same schema.
 */
export const addPropertyAliases = (
  document: OpenAPIV3.Document,
  { schemas, requestBodies }: ReturnType<typeof getPropertyAliases>
): OpenAPIV3.Document => {
  for (const [schemaName, aliases] of schemas) {
    const schema = document.components?.schemas?.[schemaName];
    if (schema) {
      addAliases(schema, aliases);
    }
  }
  for (const [requestBodyName, aliases] of requestBodies) {
    const requestBody = document.components?.requestBodies?.[requestBodyName];
    const schema =
      requestBody && !('$ref' in requestBody)
        ? requestBody.content['application/json']?.schema
        : undefined;
    if (schema) {
      addAliases(schema, aliases);
    }
  }
  return document;
};

export const createAddPropertyAliases = (schemaPath: string) => {
  const spec = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as SpecSchemaJson;
  const aliases = getPropertyAliases(spec);
  return (document: OpenAPIV3.Document) => addPropertyAliases(document, aliases);
};
