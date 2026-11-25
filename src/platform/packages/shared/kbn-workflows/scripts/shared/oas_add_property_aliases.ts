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

type SchemaOrRef = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

// Copies only this node: nested types are `$ref`s, so the copy stays small.
const requireAliasInstead = (schema: SchemaOrRef, name: string, alias: string): SchemaOrRef => {
  const copy = structuredClone(schema);
  for (const objectSchema of getObjectSchemas(copy)) {
    objectSchema.required = objectSchema.required?.map((key) => (key === name ? alias : key));
  }
  return copy;
};

/**
 * Adds each alias as a property with the same schema. When the property is required, the result
 * is `anyOf` the schema and one copy per alias that requires the alias instead, so exactly one
 * spelling is enough and an object with neither still fails.
 */
const addAliases = (schema: SchemaOrRef, aliases: PropertyAliases): SchemaOrRef => {
  const requiredAliases: Array<[string, string]> = [];
  for (const objectSchema of getObjectSchemas(schema)) {
    const { properties = {}, required = [] } = objectSchema;
    for (const [name, names] of aliases) {
      const propertySchema = properties[name];
      if (propertySchema) {
        for (const alias of names) {
          properties[alias] ??= propertySchema;
          if (required.includes(name)) {
            requiredAliases.push([name, alias]);
          }
        }
      }
    }
  }
  if (requiredAliases.length === 0) {
    return schema;
  }
  return {
    anyOf: [
      schema,
      ...requiredAliases.map(([name, alias]) => requireAliasInstead(schema, name, alias)),
    ],
  };
};

/**
 * The OpenAPI spec drops `@aliases`, so `aggs` (alias of `aggregations`) is not a known key.
 * Zod strips unknown keys, so a valid workflow silently runs without its aggregations.
 * This adds each alias as a property with the same schema.
 */
export const addPropertyAliases = (
  document: OpenAPIV3.Document,
  { schemas, requestBodies }: ReturnType<typeof getPropertyAliases>
): OpenAPIV3.Document => {
  for (const [schemaName, aliases] of schemas) {
    const componentSchemas = document.components?.schemas;
    const schema = componentSchemas?.[schemaName];
    if (componentSchemas && schema) {
      componentSchemas[schemaName] = addAliases(schema, aliases);
    }
  }
  for (const [requestBodyName, aliases] of requestBodies) {
    const requestBody = document.components?.requestBodies?.[requestBodyName];
    const content =
      requestBody && !('$ref' in requestBody) ? requestBody.content['application/json'] : undefined;
    if (content?.schema) {
      content.schema = addAliases(content.schema, aliases);
    }
  }
  return document;
};

export const createAddPropertyAliases = (schemaPath: string) => {
  const spec = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as SpecSchemaJson;
  const aliases = getPropertyAliases(spec);
  return (document: OpenAPIV3.Document) => addPropertyAliases(document, aliases);
};
