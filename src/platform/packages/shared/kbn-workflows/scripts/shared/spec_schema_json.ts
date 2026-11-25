/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';

// Minimal shape of elasticsearch-specification `output/schema/schema.json` used by the OAS patches.
export interface SpecProperty {
  name: string;
  aliases?: string[];
}

export interface SpecTypeName {
  name: string;
  namespace: string;
}

export interface SpecBehavior {
  type: SpecTypeName;
}

export interface SpecType {
  kind: string;
  name: SpecTypeName;
  shortcutProperty?: string;
  behaviors?: SpecBehavior[];
  properties?: SpecProperty[];
  body?: { kind: string; properties?: SpecProperty[] };
}

export interface SpecEndpoint {
  name: string;
  request: SpecTypeName | null;
}

export interface SpecSchemaJson {
  types: SpecType[];
  endpoints: SpecEndpoint[];
}

type SchemaOrRef = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

/** Returns the schema and every `allOf` or `anyOf` part of it that has `properties`. */
export const getObjectSchemas = (schema: SchemaOrRef): OpenAPIV3.SchemaObject[] => {
  if ('$ref' in schema) {
    return [];
  }
  return [
    ...(schema.properties ? [schema] : []),
    ...(schema.allOf ?? []).flatMap(getObjectSchemas),
    // Alias variants wrap a schema in `anyOf`; later patches still need its properties.
    ...(schema.anyOf ?? []).flatMap(getObjectSchemas),
  ];
};

export const findPropertySchema = (
  schema: SchemaOrRef,
  propertyName: string
): SchemaOrRef | undefined =>
  getObjectSchemas(schema).find(({ properties }) => properties && propertyName in properties)
    ?.properties?.[propertyName];
