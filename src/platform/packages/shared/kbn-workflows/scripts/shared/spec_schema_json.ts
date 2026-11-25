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

export interface SpecType {
  kind: string;
  name: SpecTypeName;
  shortcutProperty?: string;
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

/** Returns every `properties` object of a schema, including the ones inside `allOf` parts. */
export const getPropertyMaps = (schema: SchemaOrRef): Array<Record<string, SchemaOrRef>> => {
  if ('$ref' in schema) {
    return [];
  }
  const maps: Array<Record<string, SchemaOrRef>> = schema.properties ? [schema.properties] : [];
  for (const part of schema.allOf ?? []) {
    maps.push(...getPropertyMaps(part));
  }
  return maps;
};

export const findPropertySchema = (
  schema: SchemaOrRef,
  propertyName: string
): SchemaOrRef | undefined =>
  getPropertyMaps(schema).find((properties) => propertyName in properties)?.[propertyName];
