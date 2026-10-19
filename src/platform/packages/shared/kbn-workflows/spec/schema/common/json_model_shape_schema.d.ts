/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
/**
 * JSON Schema type values (Draft 7 / 2020-12 standard).
 * Single source of truth – used in both the Zod schema definition
 * and YAML editor autocomplete suggestions.
 */
export declare const JSON_SCHEMA_TYPE_VALUES: readonly [
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
  'null'
];
export type JsonSchemaType = (typeof JSON_SCHEMA_TYPE_VALUES)[number];
/**
 * Common JSON Schema format annotation values (Draft 7 / 2020-12 standard).
 * Single source of truth for autocomplete suggestions.
 * Reference: https://json-schema.org/draft-07/schema#section-7.3
 *
 * Only formats that fromJSONSchema actively validates are listed here.
 * Omitted formats (ipv4, ipv6, hostname, regex, etc.) are not enforced by the
 * converter, so we don't suggest them — users can use `pattern` instead.
 */
export declare const JSON_SCHEMA_FORMAT_VALUES: readonly [
  'date-time',
  'date',
  'time',
  'email',
  'uuid',
  'uri'
];
export interface JsonSchema {
  [key: string]: unknown;
  type?: JsonSchemaType | JsonSchemaType[];
  title?: string;
  description?: string;
  format?: string;
  default?: string | number | boolean | null | object;
  $ref?: string;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  /** `true`/`false`, or a schema describing the value of unknown keys (typed maps). */
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema | JsonSchema[];
  required?: string[];
  definitions?: Record<string, JsonSchema>;
  $defs?: Record<string, JsonSchema>;
  enum?: (string | number | boolean | null | object)[];
  const?: string | number | boolean | null | object;
  multipleOf?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}
/** True when `additionalProperties` is a value schema rather than a boolean. */
export declare const isSchemaValuedAdditionalProperties: (
  additionalProperties: unknown
) => additionalProperties is JsonSchema;
/**
 * JSON Schema property keywords available for autocomplete.
 * Derived from JsonSchema type – the `satisfies` clause ensures
 * every entry is a valid key of JsonSchema.
 * Update this list when adding new fields to the JsonSchema type.
 */
export declare const JSON_SCHEMA_PROPERTY_KEYS: readonly [
  'type',
  'title',
  'description',
  'format',
  'default',
  'enum',
  'const',
  'properties',
  'additionalProperties',
  'required',
  'items',
  'anyOf',
  'oneOf',
  '$ref',
  'definitions',
  'minimum',
  'exclusiveMinimum',
  'maximum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
  'pattern',
  'multipleOf',
  'minItems',
  'maxItems',
  'uniqueItems'
];
/**
 * Zod schema representing any JSON Schema node (Draft 7 / 2020-12)
 * Used recursively inside property definitions, anyOf/oneOf, etc...
 * Only includes keywords that the fromJSONSchema converter actually enforces
 */
export declare const JsonModelShapeSchema: z.ZodType<JsonSchema>;
/**
 * Root-level JSON Schema shape for workflow inputs.
 * Only exposes object-level keywords (properties, required, definitions, etc.)
 * so that monaco-yaml autocomplete at the `inputs:` level does not suggest
 * irrelevant constraint keywords like enum, maxLength, minimum, etc.
 * Individual property schemas inside `properties` still use the full
 * JsonModelShapeSchema with all keywords available.
 */
export declare const JsonModelRootShapeSchema: z.ZodObject<
  {
    type: z.ZodOptional<z.ZodLiteral<'object'>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    $ref:
      | z.ZodOptional<z.ZodString>
      | z.ZodOptional<
          z.ZodUnion<
            readonly [
              z.ZodEnum<{
                [x: string]: string;
              }>,
              z.ZodString
            ]
          >
        >;
    properties: z.ZodOptional<
      z.ZodRecord<
        z.ZodString,
        z.ZodType<JsonSchema, unknown, z.core.$ZodTypeInternals<JsonSchema, unknown>>
      >
    >;
    additionalProperties: z.ZodOptional<
      z.ZodUnion<
        readonly [
          z.ZodBoolean,
          z.ZodType<JsonSchema, unknown, z.core.$ZodTypeInternals<JsonSchema, unknown>>
        ]
      >
    >;
    required: z.ZodOptional<z.ZodArray<z.ZodString>>;
    definitions: z.ZodOptional<
      z.ZodRecord<
        z.ZodString,
        z.ZodType<JsonSchema, unknown, z.core.$ZodTypeInternals<JsonSchema, unknown>>
      >
    >;
    $defs: z.ZodOptional<
      z.ZodRecord<
        z.ZodString,
        z.ZodType<JsonSchema, unknown, z.core.$ZodTypeInternals<JsonSchema, unknown>>
      >
    >;
  },
  z.core.$strip
>;
