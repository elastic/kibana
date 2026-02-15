/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * JSON Schema type values (Draft 7 / 2020-12 standard).
 * Single source of truth – used in both the Zod schema definition
 * and YAML editor autocomplete suggestions.
 */
export const JSON_SCHEMA_TYPE_VALUES = [
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
  'null',
] as const;

export type JsonSchemaType = (typeof JSON_SCHEMA_TYPE_VALUES)[number];

/**
 * Common JSON Schema format annotation values (Draft 7 / 2020-12 standard).
 * Single source of truth for autocomplete suggestions.
 * Reference: https://json-schema.org/draft-07/schema#section-7.3
 */
export const JSON_SCHEMA_FORMAT_VALUES = [
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

export type JsonSchema = {
  type?: JsonSchemaType | JsonSchemaType[];
  title?: string;
  description?: string;
  format?: string;
  default?: unknown;
  $ref?: string;
  $id?: string;
  $schema?: string;

  // Logical Composition
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;

  // Structure
  properties?: Record<string, JsonSchema>;
  patternProperties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema | JsonSchema[];
  prefixItems?: JsonSchema[];
  required?: string[];

  // Reusability
  definitions?: Record<string, JsonSchema>;
  $defs?: Record<string, JsonSchema>;

  // Constraints
  enum?: any[];
  const?: any;
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
};

/**
 * JSON Schema property keywords available for autocomplete.
 * Derived from JsonSchema type – the `satisfies` clause ensures
 * every entry is a valid key of JsonSchema.
 * Update this list when adding new fields to the JsonSchema type.
 */
export const JSON_SCHEMA_PROPERTY_KEYS = [
  'type',
  'title',
  'description',
  'format',
  'default',
  'enum',
  'const',
  'properties',
  'patternProperties',
  'additionalProperties',
  'required',
  'items',
  'prefixItems',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'if',
  'then',
  'else',
  '$ref',
  '$id',
  '$schema',
  '$defs',
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
  'uniqueItems',
] as const satisfies readonly (keyof JsonSchema)[];

/**
 * Zod schema representing a JSON Schema model shape (Draft 7 / 2020-12).
 * This schema is converted to JSON Schema and fed to monaco-yaml, which provides
 * autocomplete suggestions for all property keys, type values, and format values
 * automatically. The `.meta({ jsonSchemaModel: true })` tag is preserved for
 * programmatic detection.
 */
export const JsonModelShapeSchema: z.ZodType<JsonSchema> = z
  .lazy(() =>
    z.object({
      $schema: z.string().url().optional(),
      $id: z.string().optional(),
      $ref: z.string().optional(),
      type: z
        .union([z.enum(JSON_SCHEMA_TYPE_VALUES), z.array(z.enum(JSON_SCHEMA_TYPE_VALUES))])
        .optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      format: z.enum(JSON_SCHEMA_FORMAT_VALUES).optional(),
      default: z.any().optional(),

      // --- Logical Operators ---
      allOf: z.array(JsonModelShapeSchema).optional(),
      anyOf: z.array(JsonModelShapeSchema).optional(),
      oneOf: z.array(JsonModelShapeSchema).optional(),
      not: JsonModelShapeSchema.optional(),
      if: JsonModelShapeSchema.optional(),
      then: JsonModelShapeSchema.optional(),
      else: JsonModelShapeSchema.optional(),

      // --- Object Properties ---
      properties: z.record(z.string(), JsonModelShapeSchema).optional(),
      patternProperties: z.record(z.string(), JsonModelShapeSchema).optional(),
      additionalProperties: z.union([z.boolean(), JsonModelShapeSchema]).optional(),
      required: z.array(z.string()).optional(),

      // --- Array Properties ---
      items: z.union([JsonModelShapeSchema, z.array(JsonModelShapeSchema)]).optional(),
      prefixItems: z.array(JsonModelShapeSchema).optional(),
      minItems: z.number().int().nonnegative().optional(),
      maxItems: z.number().int().nonnegative().optional(),
      uniqueItems: z.boolean().optional(),

      // --- Reusability ---
      definitions: z.record(z.string(), JsonModelShapeSchema).optional(),
      $defs: z.record(z.string(), JsonModelShapeSchema).optional(),

      // --- Value Constraints ---
      const: z.any().optional(),
      enum: z.array(z.any()).optional(),
      multipleOf: z.number().positive().optional(),
      minimum: z.number().optional(),
      exclusiveMinimum: z.number().optional(),
      maximum: z.number().optional(),
      exclusiveMaximum: z.number().optional(),
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().nonnegative().optional(),
      pattern: z.string().optional(),
    })
  )
  .meta({ jsonSchemaModel: true });
